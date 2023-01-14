from flask import Flask, render_template, request, jsonify
import os
import subprocess

session = {}

app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True

@app.route("/")
def qc():
    return render_template('quasi.html')

@app.route("/test")
def test():
    return render_template('test.html')

@app.route("/get_data_path/<dataset>", methods=['GET', 'POST'])
def get_data_path(dataset):
    print(os.path.join(request.url_root, "static", "data", dataset))
    return os.path.join(request.url_root, "static", "data", dataset)

@app.route("/get_datasets", methods=['GET'])
def get_datasets():
    result = {}
    print(os.listdir("data"))
    print()
    result["datasets"] = [name for name in os.listdir("data") if os.path.isdir(os.path.join(os.getcwd(), "data", name))]
    print("datasets:", result)
    return result

@app.route("/set_session/<user_id>", methods=['GET', 'POST'])
def set_session(user_id):
    if user_id not in session:
        session[user_id] = ''
        return "The session has been set!"
    else:
        return "UserId already in session"

def get_session(user_id):
    # user_id is unique id generated for each user open the website
    if user_id in session:
        return True
    else:
        return False

def get_top2_qc(qc_filepath):
    max_qc = set()
    sec_qc = set()
    max_qc_size = 0
    sec_qc_size = 0
    with open(qc_filepath) as f:
        for line in f:
            cur_size = int(line.split()[0])
            if max_qc_size < cur_size:
                #replace second largest qc with largest qc
                sec_qc_size = max_qc_size
                sec_qc = max_qc
                # replace largest qc with current qc
                max_qc_size = cur_size
                max_qc = set(line.split()[1:])
            elif sec_qc_size < cur_size:
                # replace second largest qc with current qc
                sec_qc_size = cur_size
                sec_qc = set(line.split()[1:])
    return max_qc, sec_qc

def get_nodes_edges(G, qc_nodes):
    subgraph = G.subgraph(qc_nodes)
    return list(subgraph.nodes), list(subgraph.edges)

@app.route("/mine/<request_data>", methods=['GET', 'POST'])
def mine(request_data):
    result = {}
    print(request_data)
    data = request_data.split("|")
    user_id = data[0]
    dataset = data[1]
    dataset_path = os.path.join("data", dataset)
    thread_num = "4"
    out_gamma = data[2]
    in_gamma = data[3]
    min_size = data[4]
    max_result = data[5]
    time_split_threshold = "1"
    # graph_type = data[3]
    if get_session(user_id): # check if user_id already set in session dict
        input_data_path = os.path.join(dataset_path ,"input_data")
        # cmd = "run.exe " + os.path.join(os.getcwd(), "..","..", "data", "GoogleWeb", "input_data")
        # input_data: from Google Colab, for 50K lines only !!!
        cmd = os.path.join("Tthinker_DQC", "app_qc", "run.exe ")  + " ".join([input_data_path, thread_num, out_gamma, in_gamma, min_size, time_split_threshold, max_result])
        print("cmd:", cmd)
        os.system(cmd + " > " + os.path.join(dataset_path, "stat"))
        # !cat output_* > result && rm output_* # get the "result" file
        # !Tthinker_DQC-main/maximal_check/quasiCliques result maximal_result # remove non-maximals
        cmd = "type output_* > " + os.path.join(dataset_path ,"result") +" && del -rf output_*" # changed to work with Windo    ws
        os.system(cmd)
        cmd = os.path.join("Tthinker_DQC", "maximal_check", "quasiCliques.exe ") + os.path.join(dataset_path ,"result") + " " + os.path.join(dataset_path ,"maximal_result")
        print("cmd:", cmd)
        os.system(cmd)

        maximal_quasis_cliques = []
        indecies =[]
        with open(os.path.join(dataset_path ,"maximal_result")) as f:
            for index, line in enumerate(f.readlines()):
                indecies.append((index, int(line.strip().split(" ")[0])))
                # print(line.strip())
                maximal_quasis_cliques.append(line.strip())
            # return sorted maximal quasi cliques
            sorted_list = []
            for index, _ in sorted(indecies, key=lambda tup: tup[1], reverse=True):
                sorted_list.append(maximal_quasis_cliques[index])
        
        # read statistics that saved before
        with open(os.path.join(dataset_path, "stat"), 'r') as f:
            for line in f.readlines():
                if 'Running time(without disk time)' in line:
                    line_details = line.split(":")
                    result["Running time"] = line_details[1].strip()
                elif 'WARNING' in line:
                    result["WARNING"] = True
        result["maximal_quasis_cliques"] = sorted_list
        return result
    else:
        return "Invalid Session!!"

@app.route("/get_qc_edges/<request_data>", methods=['GET', 'POST'])
def get_qc_edges(request_data):
    result = {}
    print(request_data)
    data = request_data.split("|")
    user_id = data[0]
    dataset = data[1]
    dataset_path = os.path.join("data", dataset)
    nodes = data[2]
    if get_session(user_id): # check if user_id already set in session dict

        import networkx as nx
        # edges.txt: prpeare using qc jupyter notebook. The originla name for example: web-Google-10000.txt
        with open(os.path.join(dataset_path ,"edges"), 'rb') as fh:
            G=nx.read_edgelist(fh, create_using=nx.DiGraph)

        print("nodes:", nodes)
        result["nodes"], result["edges"] = get_nodes_edges(G, nodes.split(","))
        print("nodes_len:", len(result["nodes"]), "edges_len:", len(result["edges"]))
        return result

@app.route("/get_test_graph/", methods=['GET'])
def get_test_graph():
    with open(os.path.join("test", "data", "data_graph")) as f:
        contents = f.read()
    return contents

@app.route("/expand/<request_data>", methods=['GET', 'POST'])
def expand(request_data):
    result = {}
    print(request_data)
    data = request_data.split("|")
    user_id = data[0]
    dataset = data[1]
    dataset_path = os.path.join("data", dataset)
    thread_num = "4"
    out_gamma = data[2]
    in_gamma = data[3]
    time_split_threshold = "1"
    k_prime = data[4]
    min_size = data[5]
    # graph_type = data[3]
    if get_session(user_id): # check if user_id already set in session dict
        input_data_path = os.path.join(dataset_path ,"input_data")
        # cmd = "run.exe " + os.path.join(os.getcwd(), "..","..", "data", "GoogleWeb", "input_data")
        # input_data: from Google Colab, for 50K lines only !!!
        cmd = os.path.join("Tthinker_DQC", "app_kernel", "run.exe ")  + " ".join([input_data_path, thread_num, out_gamma, in_gamma, min_size, time_split_threshold, os.path.join(dataset_path ,"maximal_result"), k_prime])
        print("cmd:", cmd)
        os.system(cmd)
        # !cat output_* > result && rm output_* # get the "result" file
        # !Tthinker_DQC-main/maximal_check/quasiCliques result maximal_result # remove non-maximals
        cmd = "type output_* > " + os.path.join(dataset_path ,"result") +" && del -rf output_*" # changed to work with Windo    ws
        os.system(cmd)
        cmd = os.path.join("Tthinker_DQC", "maximal_check", "quasiCliques.exe ") + os.path.join(dataset_path ,"result") + " " + os.path.join(dataset_path ,"maximal_result")
        print("cmd:", cmd)
        os.system(cmd)

        maximal_quasis_cliques = []
        indecies =[]
        with open(os.path.join(dataset_path ,"maximal_result")) as f:
            for index, line in enumerate(f.readlines()):
                indecies.append((index, int(line.strip().split(" ")[0])))
                # print(line.strip())
                maximal_quasis_cliques.append(line.strip())
            # return sorted maximal quasi cliques
            sorted_list = []
            for index, _ in sorted(indecies, key=lambda tup: tup[1], reverse=True):
                sorted_list.append(maximal_quasis_cliques[index])

        result["maximal_quasis_cliques"] = sorted_list
        return result
    else:
        return "Invalid Session!!"

@app.route("/get_names/<request_data>", methods=['GET', 'POST'])
def get_names(request_data):
    print("aa:")
    print(request_data)
    data = request_data.split("|")
    user_id = data[0]
    dataset = data[1]
    print("aa2:")
    # if get_session(user_id):
    path = os.path.join("data", dataset, "peopleID")
    print("aa211:")
    if not os.path.exists(path):
        print("aa2:2222")
        return "File doesn't exist!"
    print("aa233333:")
    result = {}
    print("aa3:")
    with open(path) as f:
        for line in f.readlines():
            contents = line.split("\t")
            result[contents[0]] = contents[1].strip()
    print("result:", result)
    print("aa4:")
    return result
    # else:
    #     return "Invalid Session!!"

if __name__ == '__main__':
    # app.jinja_env.auto_reload = True
    app.run(debug=True)