// var data_file =  window.location.search.substr(1); //'data/quasiclique.json';
// console.log("data_file:", data_file)
var linkStrength_factor = 1.0; // reduce it to spread out

//====================================
// Production
// website_URL = window.location.hostname
website_URL = "http://localhost:5000/"
console.log(website_URL)
    //====================================

// generate unique id for different users
const uid = () =>
    String(
        Date.now().toString(32) +
        Math.random().toString(16)
    ).replace(/\./g, '')

const USERID = uid();
console.log(USERID);

var selected_dataset = undefined
var dataset_path = undefined
var datasets = []

document.title = "Quasi-Clique";

// For MSIE < 9, forget it
function D3notok() {
    document.getElementById('sidepanel').style.visibility = 'hidden';
    var nocontent = document.getElementById('nocontent');
    nocontent.style.visibility = 'visible';
    nocontent.style.pointerEvents = 'all';
    var t = document.getElementsByTagName('body');
    var body = document.getElementsByTagName('body')[0];
}

var highlightInstances = undefined;

// Change status of a panel from visible to hidden or viceversa
var toggleDiv = undefined;

// Highlight a node in the graph. It is a closure within the d3.json() call.
var selectNode = undefined;

// mine function
var mine = undefined;
// go to graph matching
var graph_match = undefined;
// expand function
var expand = undefined;

var plot_quasi_clique = undefined;
var show_quasi_cliques = undefined;

var selected_pattern = undefined;
var grad = undefined;

var id2name = undefined;

// Do the stuff -- to be called after D3.js has loaded
function D3ok() {

    DEBUG = true;

    // set session
    d3.text(website_URL + "/set_session/" + USERID, function(response) {
        console.log(response)
    });

    // In debug mode, ensure there is a console object (MSIE does not have it by 
    // default). In non-debug mode, ensure the console log does nothing
    if (!window.console || !DEBUG) {
        window.console = {};
        window.console.log = function() {};
    }

    // Some constants
    var WIDTH = document.getElementById('networkPanel').clientWidth, //window.innerWidth,
        HEIGHT = document.getElementById('networkPanel').clientHeight, //window.innerHeight,
        SHOW_THRESHOLD = 2.5;

    // console.log("Width:", WIDTH)
    // Variables keeping graph state
    var activeNode = undefined;
    var activeInstance = undefined;
    var currentOffset = { x: 0, y: 0 };
    var QGcurrentOffset = { x: 0, y: 0 };
    var currentTranslate = [0, 0];
    var QGcurrentTranslate = [0, 0];

    var selected_graph_type; // get its value from the radio button
    var support_type;
    // Movie panel: the div into which the movie details info will be written
    var nodeInfoDiv = d3.select("#nodeInfo");

    // The D3.js scales
    var xScale = d3.scale.linear()
        .domain([0, WIDTH])
        .range([0, WIDTH]);
    var yScale = d3.scale.linear()
        .domain([0, HEIGHT])
        .range([0, HEIGHT]);
    var zoomScale = d3.scale.linear()
        .domain([1, 30])
        .range([1, 30])
        .clamp(true);

    // populate dataset combobox
    /* .......................................................................... */
    /* ....................................................................... */
    var colors = ["#3597c5", "#fb5427", "#25a40d", "#f027fc", "#a28b5c", "#cf6dac", "#7f80fb", "#26a175", "#c0811e", "#e2685f", "#749a3d", "#ce60e1", "#aa8491", "#f941ad", "#8e87c6", "#719590", "#ec5993", "#d27642", "#818eab", "#939318", "#119daa", "#4591e0", "#c87878", "#e649e1", "#6b9a5b", "#519f3c", "#a78b40", "#b9825d", "#ab8b1b", "#f2577a", "#d76b92", "#7f9476", "#908d91", "#aa7cc6", "#9e85ab", "#be63fc", "#b571e1", "#d57521", "#bd8141", "#508bfb", "#e45bad", "#f95546", "#fc1ce2", "#d84dfc", "#599f11", "#f65660", "#b28377", "#5e9b76", "#89935b", "#5c96ab", "#799914", "#489c90", "#8f933e", "#42a05a", "#9a8c77", "#e86724", "#997ee0", "#c46fc6", "#c17992", "#f145c7", "#dd6a79", "#6b90c5", "#e66844", "#7689e0", "#db5dc7", "#ce775e", "#a274fb", "#b77aac"]


    // move to specific node without highligiting. It is a closure within the d3.json() call.
    var moveToNode = undefined;

    var labels_set = undefined;
    // The call to set a zoom value -- currently unused
    // (zoom is set via standard mouse-based zooming)
    var zoomCall = undefined;

    // selected instance and highlightInstances(...) should be Global for highlightInstances() to work!
    var quasi_cliques_list = [];

    // Get the current size & offset of the browser's viewport window
    function getViewportSize(w) {
        var w = w || window;
        console.log(w);
        if (w.innerWidth != null)
            return {
                w: w.innerWidth,
                h: w.innerHeight,
                x: w.pageXOffset,
                y: w.pageYOffset
            };
        var d = w.document;
        if (document.compatMode == "CSS1Compat")
            return {
                w: d.documentElement.clientWidth,
                h: d.documentElement.clientHeight,
                x: d.documentElement.scrollLeft,
                y: d.documentElement.scrollTop
            };
        else
            return {
                w: d.body.clientWidth,
                h: d.body.clientHeight,
                x: d.body.scrollLeft,
                y: d.body.scrollTop
            };
    }

    function getQStringParameterByName(name) {
        var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    }
    /* Change status of a panel from visible to hidden or viceversa
       id: identifier of the div to change
       status: 'on' or 'off'. If not specified, the panel will toggle status
    */
    toggleDiv = function(id, status) {
            d = d3.select('div#' + id);
            console.log('TOGGLE', id, d.attr('class'), '->', status);
            if (status === undefined)
                status = d.attr('class') == 'panel_on' ? 'off' : 'on';
            d.attr('class', 'panel_' + status);
            return false;
        }
        /* Clear all help boxes and select a movie in the network and in the 
           movie details panel
        */
        // clearAndSelect = function (id) {
        //   selectNode(id,true);	// we use here the selectNode() closure
        // }
        /* Compose the content for the panel with movie details.
           Parameters: the node data, and the array containing all nodes
        */
    function getNodeInfo(n, nodeArray) {
        console.log("INFO", n);
        info = '<div id="cover">';
        info += '<br/><br/>'
        info += '<div class=t style="float: right"><span class=lbig>Node Label:</span>&nbsp;&nbsp;' + n.label + '</div>';
        info +=
            '<img src="static/img/close.png" class="action" style="top: 5px;" title="close panel" onClick="toggleDiv(\'nodeInfo\');"/>' +
            '<img src="static/img/target-32.png" class="action" style="top: -2px; left: 40px" title="center graph on node" onclick="selectNode(' + n.index + ',true);"/>';

        info += '<br/></div><div style="clear: both;">'
        info += '<div class=f><span class=l>Node ID</span>: <span class=g>' +
            n.id + '</span></div>';
        if (n.content) info += '<div class=f><span class=l>Content</span>: <br><span class=g>' +
            n.content + '</span></div>';
        if (n.links.length > 0) {
            info += '<div class=f><span class=l>Related to</span>: <br>';
            n.links.forEach(function(idx) {
                info += '[<a href="javascript:void(0);" onclick="selectNode(' +
                    idx + ',true);">' + nodeArray[idx].id + '</a>] '
            });
            info += '</div>';
        }
        return info;
    }
    // *************************************************************************
    function fill_datasets(options) {
        var select = document.getElementById("datasets_combobox");

        for (var i = 0; i < options.length; i++) {
            var opt = options[i];
            var el = document.createElement("option");
            el.textContent = opt;
            el.value = opt;
            select.appendChild(el);
        }
        // fire this event when change/choose the dataset
        $('#datasets_combobox').on('change', function(e) {
            // var optionSelected = $("option:selected", this);
            if (this.value != "Choose a Dataset") { // skip first option
                selected_dataset = this.value;
                console.log("selected dataset:", selected_dataset)
                    // draw everything
                    // run();
            }

        });

    }

    // get all datasets first
    d3.json(website_URL + "/get_datasets", function(response) {
        console.log("datasets:", response)
        fill_datasets(response["datasets"])
    });

    var svg = undefined
    var currentZoom = 20;
    var zoom_step = 0.5;



    mine = function() {
        // 1. prepare the parameters and call the server for mining
        // 2. show the maximal quasi-cliques in the pagination area
        // 3. when click on a quasi-clique, plot it
        if (selected_dataset == undefined) {
            alert("Please select a dataset!")
            return;
        }
        gamma1_prime = document.getElementById("gamma1_prime").value // out
        gamma2_prime = document.getElementById("gamma2_prime").value // in
        min_size = document.getElementById("min_size").value // in
        max_result = document.getElementById("max_result").value // in
        console.log("gamma1_prime:", gamma1_prime, "gamma2_prime:", gamma2_prime)

        request_data = USERID + "|" + selected_dataset + "|" + gamma1_prime + "|" + gamma2_prime + "|" + min_size + "|" + max_result
        console.log(request_data)
            // show the loader
        document.getElementById("loader").style.visibility = "visible";
        d3.json(website_URL + "/mine/" + request_data, function(response) {
            document.getElementById("loader").style.visibility = "hidden";
            console.log(response)

            // load names 
            request_data = USERID + "|" + selected_dataset
            d3.json(website_URL + "/get_names/" + request_data, function(response) {
                // console.log(response)
                if (response) {
                    id2name = response
                    console.log("id2name:", id2name)
                } else {
                    console.log("Unable to read names!")
                }

            });

            // show mining time details
            document.getElementById("mining_time").innerHTML = "<div class='all_padding_5'>" +
                "Mining Time: " + response["Running time"] + "<br>" +
                "</div>";

            if (response["WARNING"]) {
                alert("There are more than " + max_result + " results!")
            } else {
                show_quasi_cliques(response["maximal_quasis_cliques"])
            }



        });

        // ============================================= FUNCTIONS ===============
        show_quasi_cliques = function(data) {
            // 1. show pagination area
            // 2. group unique nodes from instances
            // 3. get the union graph
            var container = $('#pagination-container');
            container.pagination({
                dataSource: data,
                pageSize: 5,
                showSizeChanger: true,
                pageRange: 1,
                // hideFirstOnEllipsisShow: true,
                // hideLastOnEllipsisShow: true,
                // pageClassName: "paginationbuttons",
                className: 'paginationjs-small',
                sizeChangerOptions: [10, 20],
                callback: function(data, pagination) {
                    // template method of yourself
                    var html = template(data);
                    $('#patterns-container').html(html);
                },
            });

            // pagination template
            function template(data) {
                var html = '<div class="list-group" data-tag="patternList">';
                $.each(data, function(index, item) {
                    // should be global variable to be used in the html below: onclick="...
                    // item example (first value is number of nodes): 15 104279 143673 257316 298314 317571 379868 487593 514176 677378 756408 806291 832457 845262 876328 909316 
                    // change how item displayed in the list
                    qc_nodes = item.split(" ")
                    qc_size = qc_nodes[0]
                    nice_item = "Quasi-Clique " + (Number(index) + 1) + ", Size: " + qc_size
                    quasi_cliques_list[index] = qc_nodes.slice(1, item.size);
                    // console.log(instances_list)
                    html += '<a href="#" onclick="plot_quasi_clique(this,' + index + ')" class="list-group-item list-group-item-action">' + nice_item + '</a>';
                });
                html += '</div>';
                return html;
            }

            function parse_graph(graph) {
                nodeArray = []
                linkArray = []
                nodes_map = {}
                out_node2links = {} // save outgoing links
                in_node2links = {} // save outgoing links
                nodes_counter = 0;
                // console.log("graph:", graph)
                var dsv = d3.dsv(" ", "text/plain");
                dsv.parseRows(graph, function(d) {
                    // remove empty spaces
                    var f = d.filter(el => {
                        return el != null && el != '';
                    });
                    // console.log(f)
                    // get labels
                    if (f[0] == 'v') {
                        // v = {index:Number(f[1]), id:Number(f[1]), label:f[2], score:7, level:2};
                        // score: control size of the node. All nodes have same score
                        v = { index: nodes_counter, id: Number(f[1]), label: f[2], score: 10, level: 2 };
                        // console.log("v:", v)
                        nodeArray.push(v)
                            // map node's id to index
                        nodes_map[Number(f[1])] = nodes_counter;
                        nodes_counter += 1;
                    }
                    // get links
                    else if (f[0] == 'e') {
                        // add links
                        e = { source: nodes_map[Number(f[1])], target: nodes_map[Number(f[2])], weight: 1 }
                            // e = {source:nodes_map[Number(f[1])], target:nodes_map[Number(f[2])], weight:1}
                        linkArray.push(e)
                            // example: add link 0->2
                            // 1. add 2 to the links of 0
                        if (nodes_map[Number(f[1])] in out_node2links) {
                            out_node2links[nodes_map[Number(f[1])]].add(Number(nodes_map[Number(f[2])]))
                        } else {
                            out_node2links[nodes_map[Number(f[1])]] = new Set()
                            out_node2links[nodes_map[Number(f[1])]].add(Number(nodes_map[Number(f[2])]))
                        }
                        // handle incoming links (directed graph)
                        if (nodes_map[Number(f[2])] in in_node2links) {
                            in_node2links[nodes_map[Number(f[2])]].add(Number(nodes_map[Number(f[1])]))
                        } else {
                            in_node2links[nodes_map[Number(f[2])]] = new Set()
                            in_node2links[nodes_map[Number(f[2])]].add(Number(nodes_map[Number(f[1])]))
                        }
                    }
                });

                //update each node links
                console.log("out_node2links:", out_node2links)
                console.log("in_node2links:", in_node2links)
                nodeArray.forEach(function(n) {
                    // out links: rename later
                    n["links"] = out_node2links[nodes_map[n.id]]
                        // in links
                    n["in_links"] = in_node2links[nodes_map[n.id]]
                });

                return [nodeArray, linkArray]
            }

            function preprocess_quasicliques(data) {
                // nodes = data["nodes"]: list of nodes
                // edges = data["edges"]: list of edges
                result = ""
                nodes = data["nodes"]
                edges = data["edges"]
                    // console.log(graph)
                nodes.forEach(function(c, index) {
                    // console.log(index, c)
                    // !!! label = "0" for now !!! means no labels/one label
                    result += "v " + nodes[index] + " " + "0" + "\n";
                })
                edges.forEach(function(edge, index) {
                    // console.log(index, c)
                    result += "e " + edge[0] + " " + edge[1] + "\n";
                })

                return result
            }

            plot_quasi_clique = function(el, index) {
                console.log("el:", el, "index:", index)
                d3.selectAll('svg').remove();
                // reset currentOffset
                currentOffset = currentOffset = { x: 0, y: 0 };
                // find all the elements in your channel list and loop over them
                Array.prototype.slice.call(document.querySelectorAll('div[data-tag="patternList"] a')).forEach(function(element) {
                    // remove the selected class
                    element.classList.remove('active');
                });
                // add the selected class to the element that was clicked
                el.classList.add('active');

                nodes = quasi_cliques_list[index]; // data graph node ids
                selected_pattern = nodes;
                console.log("Pattern Nodes:", nodes)

                // using quasic clique nodes, get edges using Networkx. Find a better way later...
                request_data = USERID + "|" + selected_dataset + "|" + nodes
                console.log(request_data)
                document.getElementById("loader").style.visibility = "visible";
                d3.json(website_URL + "/get_qc_edges/" + request_data, function(response) {
                    document.getElementById("loader").style.visibility = "hidden";
                    console.log("response:", response)

                    graph = preprocess_quasicliques(response)
                        // console.log("after preprocessing", graph)

                    result = parse_graph(graph)
                    console.log("after parsing:", result)
                    UGnodeArray = result[0];
                    UGlinkArray = result[1];
                    // });
                    //------
                    console.log("UGnodeArray", UGnodeArray)
                    console.log("UGlinkArray", UGlinkArray)

                    // fill labels_set
                    labels_set = new Set();
                    UGnodeArray.forEach(function(node) {
                        labels_set.add(node.label);
                    })
                    console.log("labels_set:", labels_set)

                    // labels colors
                    var colorNode = d3.scale.ordinal().domain(labels_set)
                        // .range(["green", "blue"])
                        .range(colors.slice(0, labels_set.size))

                    // var force_size = d3.scale.linear()
                    //     .domain([1, 100]) // we know score is in this domain
                    //     .range([1, 15])
                    //     .clamp(true);

                    var force = d3.layout.force()
                        // .charge(-1)
                        // .gravity(0.5) //J: better than keep moving.
                        .size([WIDTH / currentZoom, HEIGHT / currentZoom]) // use this to center the graph
                        // .size([WIDTH / force_size(UGnodeArray.length), HEIGHT / force_size(UGnodeArray.length)])
                        .linkStrength(function(d, idx) { console.log("linkStrength:", d.weight * linkStrength_factor); return d.weight * linkStrength_factor; });

                    console.log("force size:", [WIDTH / currentZoom, HEIGHT / currentZoom])
                        // console.log("force size:", [WIDTH / force_size(UGnodeArray.length), HEIGHT / force_size(UGnodeArray.length)])


                    force
                        .nodes(UGnodeArray)
                        .links(UGlinkArray)
                        .start();

                    // A couple of scales for node radius & edge width
                    var node_size = d3.scale.linear()
                        .domain([5, 10]) // we know score is in this domain
                        .range([1, 16])
                        .clamp(true); // to force the range min/max; not to go less or more than the range: https://www.d3indepth.com/scales/

                    // Add to the page the SVG element that will contain the graph
                    svg = d3.select("#networkPanel").append("svg")
                        .attr('xmlns', 'http://www.w3.org/2000/svg')
                        .attr("width", WIDTH)
                        .attr("height", HEIGHT - 50) // network panel bottom border is cut. This is a quick fix. Later find the exact reason!!
                        .attr("id", "graph")
                        .attr("viewBox", "0 0 " + (WIDTH) + " " + (HEIGHT)) //J: increse viewBox, so entire graph looks smaller
                        .attr("preserveAspectRatio", "xMidYMid meet");

                    /* Add drag & zoom behaviours */
                    svg.call(d3.behavior.drag()
                        .on("drag", dragmove));
                    svg.call(d3.behavior.zoom()
                        // .x(xScale)
                        // .y(yScale)
                        // .scaleExtent([1, 100])
                        .on("zoom", doZoom));

                    var networkGraph = svg.append('svg:g').attr('class', 'grpParent');

                    // marker
                    svg.append('defs').append('marker')
                        .attr('id', 'arrowhead')
                        .attr('viewBox', '-0 -5 10 10')
                        .attr('refX', 25) // control the distance between the arrow and the circle
                        .attr('refY', 0)
                        .attr('orient', 'auto')
                        .attr('markerWidth', 5)
                        .attr('markerHeight', 5)
                        .attr('xoverflow', 'visible')
                        .append('svg:path')
                        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                        .attr("class", "arrow")
                        // .attr('fill', 'black')
                        // .style('stroke', 'white');

                    // highlighted marker
                    svg.append('defs').append('marker')
                        .attr('id', 'arrowhead_highlighted')
                        .attr('viewBox', '-0 -5 10 10')
                        .attr('refX', 25) // control the distance between the arrow and the circle
                        .attr('refY', 0)
                        .attr('orient', 'auto')
                        .attr('markerWidth', 5)
                        .attr('markerHeight', 5)
                        .attr('xoverflow', 'visible')
                        .append('svg:path')
                        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                        .attr("class", "arrow_highlighted")

                    // highlighted marker for incoming links
                    svg.append('defs').append('marker')
                        .attr('id', 'arrowhead_highlighted_in')
                        .attr('viewBox', '-0 -5 10 10')
                        .attr('refX', 25) // control the distance between the arrow and the circle
                        .attr('refY', 0)
                        .attr('orient', 'auto')
                        .attr('markerWidth', 5)
                        .attr('markerHeight', 5)
                        .attr('xoverflow', 'visible')
                        .append('svg:path')
                        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                        .attr("class", "arrow_highlighted_in")

                    grad = svg.append("defs").append("linearGradient").attr("id", "grad")
                        .attr("x1", "0%").attr("x2", "0%").attr("y1", "100%").attr("y2", "0%");
                    grad.append("stop").attr("offset", "50%").style("stop-color", "red"); //ff0000
                    grad.append("stop").attr("offset", "50%").style("stop-color", "blue");

                    // links: simple lines
                    var graphLinks = networkGraph.append('svg:g').attr('class', 'grp gLinks')
                        .selectAll("line")
                        .data(UGlinkArray, function(d) { return d.source.id + '-' + d.target.id; })
                        .enter().append("line")
                        .style('stroke-width', 2) //function(d) { return edge_width(d.weight);} )
                        .attr("class", "link")
                        .attr('marker-end', 'url(#arrowhead)')
                        .attr('id', function(d) { return "link" + d.source.index + '-' + d.target.index; })

                    // nodes: an SVG circle
                    var graphNodes = networkGraph.append('svg:g').attr('class', 'grp gNodes')
                        .selectAll("circle")
                        .data(UGnodeArray, function(d) { return d.id; })
                        .enter().append("svg:circle")
                        .attr('id', function(d) { return "c" + d.index; })
                        .attr('class', "circle")
                        .attr('r', function(d) { return node_size(d.score || 3); })
                        .attr('pointer-events', 'all')
                        // .attr("fill", function(d) { return colorNode(d.label); }) // use label id to color the node
                        .attr("fill", "#25a40d")
                        .on("click", function(d) { showMoviePanel(d); })
                        .on("mouseover", function(d) { highlightGraphNode(d, true, this); })
                        .on("mouseout", function(d) { highlightGraphNode(d, false, this); })

                    // labels: a group with two SVG text: a title and a shadow (as background)
                    var graphLabels = networkGraph.append('svg:g').attr('class', 'grp gLabel')
                        .selectAll("g.label")
                        .data(UGnodeArray, function(d) { return d.id })
                        .enter().append("svg:g")
                        .attr('id', function(d) { return "l" + d.index; })
                        .attr('class', 'label');

                    // shadows = graphLabels.append('svg:text')
                    //   .attr('x','-2em')
                    //   .attr('y','-.3em')
                    //   .attr('pointer-events', 'none') // they go to the circle beneath
                    //   .attr('id', function(d) { return "lb" + d.index; } )
                    //   .attr('class','nshadow')
                    //   .text( function(d) { return d.label; } );

                    labels = graphLabels.append('svg:text')
                        .attr('x', '-2em')
                        .attr('y', '-1.5em')
                        .attr('pointer-events', 'none') // they go to the circle beneath
                        .attr('id', function(d) { return "lf" + d.index; })
                        .attr('class', 'nlabel')
                        .text(function(d) { return id2name[d.id]; });

                    d3.select("input[type=range]")
                        .on("input", inputted);

                    function inputted() {
                        linkStrength_factor = +this.value
                        force
                            .nodes(UGnodeArray)
                            .links(UGlinkArray)
                            .start();
                    }

                    moveToNode = function(new_idx, width_, height_) {
                        console.log("..POS: ", currentOffset.x, currentOffset.y, '->',
                            UGnodeArray[new_idx].x, UGnodeArray[new_idx].y);
                        s = getViewportSize();
                        console.log("ViewportSize:", s);
                        width = s.w < width_ ? s.w : width_;
                        height = s.h < height_ ? s.h : height_;
                        offset = {
                            x: s.x + width / 2 - UGnodeArray[new_idx].x * currentZoom,
                            y: s.y + height / 2 - UGnodeArray[new_idx].y * currentZoom
                        };
                        repositionGraph(offset, undefined, 'move');
                    }

                    selectNode = function(new_idx, doMoveTo) {
                        console.log("SELECT", new_idx, doMoveTo);

                        // do we want to center the graph on the node?
                        doMoveTo = doMoveTo || false;
                        if (doMoveTo) {
                            console.log("..POS: ", currentOffset.x, currentOffset.y, '->',
                                UGnodeArray[new_idx].x, UGnodeArray[new_idx].y);
                            s = getViewportSize();
                            width = s.w < WIDTH ? s.w : WIDTH;
                            height = s.h < HEIGHT ? s.h : HEIGHT;
                            offset = {
                                x: s.x + width / 2 - UGnodeArray[new_idx].x * currentZoom,
                                y: s.y + height / 2 - UGnodeArray[new_idx].y * currentZoom
                            };
                            repositionGraph(offset, undefined, 'move');
                        }
                        // Now highlight the graph node and show its movie panel
                        // highlightGraphNode(UGnodeArray[new_idx], true);
                        showMoviePanel(UGnodeArray[new_idx]);
                    }

                    function highlightGraphNode(node, on) {
                        //J: !!! Change this method later to get neighbors from server !!!

                        //if( d3.event.shiftKey ) on = false; // for debugging

                        // If we are to activate a movie, and there's already one active,
                        // first switch that one off
                        if (on && activeNode !== undefined) {
                            console.log("..clear: ", activeNode);
                            highlightGraphNode(UGnodeArray[activeNode], false);
                            console.log("..cleared: ", activeNode);
                        }

                        // console.log("SHOWNODE "+node.index+" ["+node.label + "]: " + on);
                        // console.log(" ..object ["+node + "]: " + on);
                        // locate the SVG nodes: circle & label group
                        circle = d3.select('#c' + node.index);
                        label = d3.select('#l' + node.index);
                        // console.log(" ..DOM: ",label);

                        // highlight out links
                        Object(node.links).forEach(function(target_node) {
                            circle = d3.select("#c" + target_node);
                            circle_obj = circle[0][0].__data__
                            if (on) {
                                if (circle_obj.links.has(node.index)) {
                                    circle.style("fill", "url(#grad)");
                                } else {
                                    // circle.classed('in_links', on);
                                    circle.style("fill", "red"); // out going links in red
                                }

                            } else {
                                // console.log("circle:", circle_obj)
                                circle.style("fill", "#25a40d"); // circle orignial color = green
                            }
                            link = d3.select("#link" + node.index + '-' + target_node);
                            // console.log("link:", link)
                            // console.log("link:",link.attr('id'))
                            // turn off highlight link (interfer with highlight instances)
                            link.classed('highlighted', on);
                            // highlight arrows
                            if (on) {
                                link.attr('marker-end', 'url(#arrowhead_highlighted)')
                            } else {
                                link.attr('marker-end', 'url(#arrowhead)')
                            }
                        });
                        // highlight in links
                        Object(node.in_links).forEach(function(source_node) {
                            circle = d3.select("#c" + source_node)
                            circle_obj = circle[0][0].__data__
                            if (on) {
                                if (circle_obj.in_links.has(node.index)) {
                                    circle.style("fill", "url(#grad)");
                                } else {
                                    // circle.classed('in_links', on);
                                    circle.style("fill", "blue"); // circle with in-links in blue
                                }

                            } else {
                                circle.style("fill", "#25a40d");
                            }
                            link = d3.select("#link" + source_node + '-' + node.index);
                            // console.log("link:", link)
                            // console.log("link:",link.attr('id'))
                            // turn off highlight link (interfer with highlight instances)
                            link.classed('in_highlighted', on);
                            // highlight arrows
                            if (on) {
                                link.attr('marker-end', 'url(#arrowhead_highlighted_in)')
                            } else {
                                link.attr('marker-end', 'url(#arrowhead)')
                            }
                        });
                        // set the value for the current active movie
                        activeNode = on ? node.index : undefined;
                        // console.log("SHOWNODE finished: "+node.index+" = "+on );
                    }

                    function showMoviePanel(node) {
                        // Fill it and display the panel
                        console.log("node:", node);
                        nodeInfoDiv
                            .html(getNodeInfo(node, UGnodeArray))
                            .attr("class", "panel_on");
                    }

                    function repositionGraph(off, z, mode) {
                        // console.log( "REPOS: off=", off, "zoom=", z, "mode=", mode );

                        // do we want to do a transition?
                        var doTr = (mode == 'move');

                        // drag: translate to new offset
                        if (off !== undefined &&
                            (off.x != currentOffset.x || off.y != currentOffset.y)) {
                            g = d3.select('g.grpParent')
                            if (doTr)
                                g = g.transition().duration(500);
                            // console.log("offset:", off)
                            g.attr("transform", function(d) {
                                return "translate(" +
                                    off.x + "," + off.y + ")"
                            });
                            currentOffset.x = off.x;
                            currentOffset.y = off.y;
                        }

                        // zoom: get new value of zoom
                        if (z === undefined) {
                            if (mode != 'tick')
                                return; // no zoom, no tick, we don't need to go further
                            z = currentZoom;
                        } else
                            currentZoom = z;

                        // move edges
                        e = doTr ? graphLinks.transition().duration(500) : graphLinks;
                        e
                            .attr("x1", function(d) { return z * (d.source.x); })
                            .attr("y1", function(d) { return z * (d.source.y); })
                            .attr("x2", function(d) { return z * (d.target.x); })
                            .attr("y2", function(d) { return z * (d.target.y); });

                        // move nodes
                        n = doTr ? graphNodes.transition().duration(500) : graphNodes;
                        n
                            .attr("transform", function(d) {
                                return "translate(" +
                                    z * d.x + "," + z * d.y + ")"
                            });
                        // move labels
                        l = doTr ? graphLabels.transition().duration(500) : graphLabels;
                        l
                            .attr("transform", function(d) {
                                return "translate(" +
                                    z * d.x + "," + z * d.y + ")"
                            });
                    }

                    function dragmove(d) {
                        // console.log("DRAG",d3.event);
                        offset = {
                            x: currentOffset.x + d3.event.dx,
                            y: currentOffset.y + d3.event.dy
                        };
                        repositionGraph(offset, undefined, 'drag');
                    }

                    function doZoom(increment) {
                        // this line because drag event trigger zoom as well. This will prevent that!
                        if (!d3.event.sourceEvent.deltaY) return;
                        // newZoom = increment === undefined ? d3.event.scale 
                        //     : zoomScale(currentZoom+increment);
                        // J: 
                        console.log("currentTranslate:", currentTranslate, "d3.event.translate:", d3.event.translate, "d3.event.scale:", d3.event.scale)
                            // newZoom = currentZoom > d3.event.scale  ? zoomScale(currentZoom * d3.event.scale) : d3.event.scale
                            // newZoom = zoomScale(currentZoom * d3.event.scale)
                            // zoom out
                        if (d3.event.translate[0] > currentTranslate[0]) {
                            console.log("Zoom out...")
                            newZoom = zoomScale(currentZoom - zoom_step) //d3.event.scale
                            currentTranslate = d3.event.translate
                        }
                        // zoom in
                        else {
                            console.log("Zoom in...")
                            newZoom = zoomScale(currentZoom + zoom_step)
                            currentTranslate = d3.event.translate
                        }
                        console.log("ZOOM", currentZoom, "->", newZoom, increment);
                        if (currentZoom == newZoom)
                            return; // no zoom change

                        // See if we cross the 'show' threshold in either direction
                        if (currentZoom < SHOW_THRESHOLD && newZoom >= SHOW_THRESHOLD)
                            svg.selectAll("g.label").classed('on', true);
                        else if (currentZoom >= SHOW_THRESHOLD && newZoom < SHOW_THRESHOLD)
                            svg.selectAll("g.label").classed('on', false);

                        // See what is the current graph window size
                        s = getViewportSize();
                        console.log("s:", s)
                        width = s.w < WIDTH ? s.w : WIDTH;
                        height = s.h < HEIGHT ? s.h : HEIGHT;
                        console.log("WIDTH, HEIGHT", WIDTH, HEIGHT)
                        console.log("width, height", width, height)

                        // Compute the new offset, so that the graph center does not move
                        zoomRatio = newZoom / currentZoom;
                        newOffset = {
                            x: currentOffset.x * zoomRatio + width / 2 * (1 - zoomRatio),
                            y: currentOffset.y * zoomRatio + height / 2 * (1 - zoomRatio)
                        };
                        console.log("offset", currentOffset, "->", newOffset);

                        // Reposition the graph
                        repositionGraph(newOffset, newZoom, "zoom");
                    }
                    force.on("tick", function() {
                        console.log('ticking...')
                            // J: in the begining, center the graph and zoom in a little bit
                            // center the graph
                            // console.log("WIDTH:", WIDTH, "HEIGHT:", HEIGHT)
                            // repositionGraph({x:-WIDTH/2, y:-HEIGHT/2}, 2,'zoom');
                        repositionGraph(undefined, undefined, 'tick');
                    });
                    // zoom and center the graph
                    // currentOffset = {x:currentOffset.x - WIDTH/2, y:currentOffset.y - HEIGHT/2}
                    // currentZoom = 3
                    // repositionGraph({x:currentOffset.x - WIDTH/2, y:currentOffset.y - HEIGHT/2}, 3, 'zoom');
                    console.log("force", force)

                });
            }

        }
    }

    graph_match = function() {
        var max_result = document.getElementById("max_result").value
            // some validations first
        if (selected_pattern == undefined) {
            alert("Please select a pattern.");
            return;
        }
        if (max_result == "") {
            // default value in case of empty/not specified by user
            max_result = 10000
        }

        var url = new URL(website_URL + "/gm");
        url.search = new URLSearchParams({ "query_graph": selected_pattern, "selected_dataset": selected_dataset, "instances_max_result": max_result });
        window.open(url.toString());
        // window.open(website_URL + "/gm?nodes=" + selected_pattern + "&dataset=" + selected_dataset + "&instances=" + document.getElementById("max_result").value);


    }

    expand = function() {
        if (selected_dataset == undefined) {
            alert("Please select a dataset!")
            return;
        }
        gamma1 = document.getElementById("gamma1").value // out
        gamma2 = document.getElementById("gamma2").value // in
        k_prime = document.getElementById("k_prime").value
        min_size_ex = document.getElementById("min_size_ex").value
        request_data = USERID + "|" + selected_dataset + "|" + gamma1 + "|" + gamma2 + "|" + k_prime + "|" + min_size_ex
        console.log(request_data)
            // show the loader
        document.getElementById("loader").style.visibility = "visible";
        d3.json(website_URL + "/expand/" + request_data, function(response) {
            document.getElementById("loader").style.visibility = "hidden";
            console.log(response)
            show_quasi_cliques(response["maximal_quasis_cliques"])

        });
    }

} // end of D3ok()