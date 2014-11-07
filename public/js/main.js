var app = angular.module('rotool', []);

// Just pretend this is not here, ok?
app.directive('fileInput', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function (scope, elm, attrs) {
            elm.bind('change', function () {
                $parse(attrs.fileInput)
                    .assign(scope, elm[0].files);
                scope.$apply();
            })
        }
    }
}]);

app.controller('checkController', ['$scope', '$http', function ($scope, $http) {
    $scope.sessionID = null;
    $scope.headers = [];
    $scope.treatments = [];
    $scope.otherOptions = ['ID', 'UNUSED'];
    $scope.defineOptions = [];
    $scope.musicPlaying = false;
    $scope.files = [];
    $scope.devMode = true;


    $scope.resultBlocks = [];

    $scope.reloadDefineOptions = function () {
        $scope.defineOptions = $scope.otherOptions.concat($scope.treatments);
    };

    $scope.filesChanged = function (elm) {
        $scope.files = elm.files;
        $scope.$apply();
    };

    $scope.addTreatment = function (header) {
        if (!_.contains($scope.treatments, header) && !_.isEmpty(header)) {
            $scope.header = '';

            $scope.treatments.push(header);
            $scope.reloadDefineOptions();
        }
    };

    $scope.removeTreatment = function (treatment) {
        if (_.contains($scope.treatments, treatment)) {
            _.pull($scope.treatments, treatment);

            $scope.reloadDefineOptions();
            $scope.checkCompletion();
        }
    };

    var toggleUploadLoading = function () {
//        console.log('toggles');
        $('#upload-spinner').toggle();
    };

    var toggleResultLoading = function () {
        $('#result-spinner').toggle();
    };

    $scope.upload = function () {
        var fd = new FormData();

        if ($scope.files.length < 1) {
            console.log('no files');
            swal("Oops...", "No files found", "error");
        } else {
            //TODO limit to one file
            angular.forEach($scope.files, function (file) {
                fd.append('file', file)
            });
            toggleUploadLoading();
            $http.post('uploadCSV', fd, {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            })
                .success(function (d) {
                    $scope.headers = [];
                    _.forEach(d, function (item) {
                        var head = {name: item, treatment: undefined};
                        $scope.headers.push(head);
                    });
                    $scope.reloadDefineOptions();
                    $scope.fillOptions();
                    $('#dataExplainHelp').show();
                    toggleUploadLoading();
                })
                .error(function () {
                    toggleUploadLoading();
                });
        }
    };

    $scope.checkCompletion = function () {
        if (!_.isEmpty($scope.files)) {
//            console.log($scope.headers);
//            if (!_.isEmpty($scope.headers)) {
            var withoutTreatment = false;
            _.forEach($scope.headers, function (header) {
                if (_.isUndefined(header.treatment)) {
                    withoutTreatment = true;
                }
            });
            if (!withoutTreatment) {
                var btn = $('#stepThree').find('.btn');
                if (btn.hasClass('disabled')) {
                    btn.removeClass('disabled');
                }
            }
//            } else {
//                console.log('no headers loaded');
//            }
        } else {
            swal("Oops...", "No file found!", "error");
        }
    };

    var toggleResultsView = function () {

        if (!$scope.devMode) {
            if ($scope.musicPlaying) {
                $('#music').trigger("pause");
                $scope.musicPlaying = false;
            } else {
                $('#music').trigger("play");
                $scope.musicPlaying = true;
            }
        }

        //TODO make this lest specific
        $('#stepOne').toggle();
        $('#stepTwo').toggle();
        $('#stepThree').toggle();
        $('#results').toggle();

    };

    $scope.getResults = function () {

        var postIt = function (headers) {

            toggleResultsView();

            var fd = new FormData();


            if ($scope.files.length < 1) {
                console.log('no files');
                return;
            }

            //TODO limit to one file
            // add file to form data
            angular.forEach($scope.files, function (file) {
                fd.append('file', file)
            });

            // add header list to form data
            fd.append('headers', angular.toJson(headers));
            fd.append('options', angular.toJson($scope.defineOptions));

            // post it
            $http.post('getResults', fd, {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            })
                .success(function (d) {
                    swal("Good job!", "It looks like it worked!", "success");
                    $scope.processResults(d);
                })
                .error(function (err) {
                    toggleResultsView();
                    swal("Oops...", err, "error");
                    console.log('error', err);
                });
        };
        postIt($scope.headers);
    };

    var ColorLuminance = function (hex, lum) {

        // validate hex string
        hex = String(hex).replace(/[^0-9a-f]/gi, '');
        if (hex.length < 6) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        lum = lum || 0;

        // convert to decimal and change luminosity
        var rgb = "#", c, i;
        for (i = 0; i < 3; i++) {
            c = parseInt(hex.substr(i * 2, 2), 16);
            c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
            rgb += ("00" + c).substr(c.length);
        }

        return rgb;
    };

    var makeid = function () {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 8; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    };

    var injectGraph = function (thisBlock, cb) {

        var json = thisBlock.json;
        var njson = thisBlock.njson;
        var id = thisBlock.id;

        thisBlock.defaultNodeWidth = 30;
        thisBlock.defaultNodeHeight = 30;
        thisBlock.minNodeSize = 10;
        thisBlock.maxNodeSize = 50;
        thisBlock.smallestNode = 99999999999;
        thisBlock.largestNode = 0;

        thisBlock.layoutOptions = [
            {key: 'cose', value: 'cose'},
            {key: 'grid', value: 'grid'},
            {key: 'circle', value: 'circle'},
            {key: 'concentric', value: 'concentric'},
            {key: 'breadthfirst', value: 'breadthfirst'}
        ];

        thisBlock.edgeColors = [
            {key: 'turqoise', value: '#1ABC9C'},
            {key: 'emerald', value: '#2ECC71'},
            {key: 'peterRiver', value: '#3498DB'},
            {key: 'amethyst ', value: '#9B59B6'},
            {key: 'wetAsphalt ', value: '#34495E'},
            {key: 'sunFlower ', value: '#F1C40F'},
            {key: 'carrot', value: '#E67E22'},
            {key: 'alizarin', value: '#E74C3C'},
            {key: 'clouds ', value: '#ECF0F1'},
            {key: 'concrete ', value: '#95A5A6'}
        ];

        thisBlock.nodeColors = [
            {key: 'turqoise', value: '#1ABC9C'},
            {key: 'emerald', value: '#2ECC71'},
            {key: 'peterRiver', value: '#3498DB'},
            {key: 'amethyst', value: '#9B59B6'},
            {key: 'wetAsphalt', value: '#34495E'},
            {key: 'sunFlower', value: '#F1C40F'},
            {key: 'carrot', value: '#E67E22'},
            {key: 'alizarin', value: '#E74C3C'},
            {key: 'clouds', value: '#ECF0F1'},
            {key: 'concrete', value: '#95A5A6'}
        ];

        thisBlock.defaultNodeColor = thisBlock.edgeColors[1].value;
        thisBlock.defaultEdgeColor = thisBlock.nodeColors[2].value;
        thisBlock.defaultLayout = thisBlock.layoutOptions[3].value;

        thisBlock.currentNodeColor = thisBlock.defaultNodeColor;

        thisBlock.layout = {
            name: thisBlock.defaultLayout.value,
            padding: 10
        };

        thisBlock.nodeCSS = {
            'width': thisBlock.defaultNodeWidth,
            'height': thisBlock.defaultNodeHeight,
            'content': 'data(name)',
            'background-color': thisBlock.defaultNodeColor

        };

        thisBlock.edgeCSS = {
            'width': '2',
            'target-arrow-shape': 'triangle',
            'line-color': thisBlock.defaultEdgeColor,
            'target-arrow-color': thisBlock.defaultEdgeColor
        };

        thisBlock.questionableCSS = {
            'line-style': 'dashed',
            'target-arrow-shape': 'tee'
        };

        thisBlock.highlightedCSS = {
            'background-color': '#ECF0F1',
            'line-color': '#ECF0F1',
            'target-arrow-color': '#61bffc',
            'transition-property': 'background-color, line-color, target-arrow-color',
            'transition-duration': '0.5s'
        };

        var nodes = [];
        var edges = [];

        $http.get(json)
            .success(function (data) {
                var network = data;
                $http.get(njson)
                    .success(function (data) {
                        var names = data;
                        _.forEach(network, function (ob) {
                            var node1Int = ob.node1;
                            var node2Int = ob.node2;
                            var node1 = node1Int.toString();
                            var node2 = node2Int.toString();
                            var newID = node1 + '' + node2;


                            var questionable = '';
                            if (Math.sin(ob.pcor) < 0) {
                                questionable = 'questionable';
                            }

                            var edge = {data: {id: newID, source: node1, target: node2}, classes: questionable};
                            edges.push(edge);

                            var foundNode = _.where(nodes, {data: { id: node1 }});
                            var foundNodeTwo = _.where(nodes, {data: { id: node2 }});

                            if (_.isEmpty(foundNode)) {
                                var nameA = names[node1Int - 1]; //start from 0
                                var nodeA = {data: {id: node1, name: nameA}};
                                nodes.push(nodeA);
                            }
                            if (_.isEmpty(foundNodeTwo)) {
                                var nameB = names[node2Int - 1]; //start from 0
                                var nodeB = {data: {id: node2, name: nameB}};
                                nodes.push(nodeB);
                            }
                        });

//                TODO tell node about its connection count
                        _.forEach(nodes, function (node) {
                            var count1 = _.where(edges, {data: {source: node.data.id}}).length;
                            var count2 = _.where(edges, {data: {target: node.data.id}}).length;

                            var count = count1 + count2;
                            if (count > thisBlock.largestNode) {
                                thisBlock.largestNode = count;
                            }
                            if (count < thisBlock.smallestNode) {
                                thisBlock.smallestNode = count;
                            }
                            node.data.weight = count;
                        });


//                        var outDiv = $('<div></div>').attr('id', tmpID);

                        var cy = cytoscape({
                            container: document.getElementById(id),
                            style: cytoscape.stylesheet()
                                .selector('node')
                                .css(thisBlock.nodeCSS)
                                .selector('edge')
                                .css(thisBlock.edgeCSS)
                                .selector('edge.questionable')
                                .css(thisBlock.questionableCSS)
                                .selector('.highlighted')
                                .css(thisBlock.highlightedCSS),

                            elements: {
                                nodes: nodes,
                                edges: edges
                            },

                            layout: thisBlock.layout
                        });

                        $(window).resize(function () {
                            cy.resize();
                        });
                        console.log($scope.resultBlocks);
                        cb(cy);
                    })
                    .error(function (data) {
                        console.log('error', data);
                    });
            })
            .error(function (data) {
                console.log('error', data);
            });


    };

    $scope.processResults = function (result) {

        //result should already be parsed json (angular does it by its self)

        if ($scope.devMode) {
            console.log('results:', result);
        }


        if (result) {
            result.forEach(function (res) {
                var thisBlock = {};

                thisBlock.treatment = res[0].split('public').pop();
                thisBlock.net = res[1].split('public').pop();
                thisBlock.json = res[2].split('public').pop();
                thisBlock.njson = res[3].split('public').pop();
                thisBlock.hive = res[4].split('public').pop();
                thisBlock.id = makeid();

                thisBlock.sizeByDegreeToggle = false;
                thisBlock.colorByDegreeToggle = false;
                thisBlock.selectedLayout = thisBlock.defaultLayout;
                injectGraph(thisBlock, function (out) {
                    thisBlock.cy = out;

                    thisBlock.nodeColorByDegree = function () {
                        var ligherColor = ColorLuminance(thisBlock.currentNodeColor, -0.50);
                        var darkerColor = ColorLuminance(thisBlock.currentNodeColor, 0.50);
                        var map = 'mapData(weight, ' + thisBlock.smallestNode + ', ' + thisBlock.largestNode + ', ' + ligherColor + ', ' + darkerColor + ')';
                        console.log('updated color');
                        thisBlock.cy.style().selector('node').css('background-color', map).update();
                    };
                });


                $scope.resultBlocks.push(thisBlock);

                toggleResultLoading();
            });
        }
        else {
            swal("Oops...", "No result was returned", "error");
        }
    };

    $scope.fillOptions = function () {
        _.forEach($scope.headers, function (head) {
            head.treatment = $scope.defineOptions[1];
        });
        $scope.checkCompletion();
    };

//TODO get rid of this ASAP
    $scope.devFill = function () {
        $scope.treatments = ['MOCK', 'AVR', 'VIR'];
        $scope.reloadDefineOptions();
        $scope.headers = [
            {"name": "gene_id", "treatment": "UNUSED", "$$hashKey": "003"},
            {
                "name": "tracking_id",
                "treatment": "ID",
                "$$hashKey": "004"
            },
            {
                "name": "MOCK_1_1",
                "treatment": "MOCK",
                "$$hashKey": "005",
                "repetition": 1,
                "time": {"hours": 1}
            },
            {
                "name": "AVR_1_1",
                "treatment": "AVR",
                "$$hashKey": "006",
                "repetition": 1,
                "time": {"hours": 1}
            },
            {
                "name": "VIR_1_1",
                "treatment": "VIR",
                "$$hashKey": "007",
                "repetition": 1,
                "time": {"hours": 1}
            },
            {
                "name": "MOCK_6_1",
                "treatment": "MOCK",
                "$$hashKey": "008",
                "repetition": 1,
                "time": {"hours": 6}
            },
            {
                "name": "AVR_6_1",
                "treatment": "AVR",
                "$$hashKey": "009",
                "repetition": 1,
                "time": {"hours": 6}
            },
            {
                "name": "VIR_6_1",
                "treatment": "VIR",
                "$$hashKey": "00A",
                "repetition": 1,
                "time": {"hours": 6}
            },
            {
                "name": "MOCK_12_1",
                "treatment": "MOCK",
                "$$hashKey": "00B",
                "repetition": 1,
                "time": {"hours": 12}
            },
            {
                "name": "AVR_12_1",
                "treatment": "AVR",
                "$$hashKey": "00C",
                "repetition": 1,
                "time": {"hours": 12}
            },
            {
                "name": "VIR_12_1",
                "treatment": "VIR",
                "$$hashKey": "00D",
                "repetition": 1,
                "time": {"hours": 12}
            },
            {
                "name": "MOCK_1_2",
                "treatment": "MOCK",
                "$$hashKey": "00E",
                "repetition": 2,
                "time": {"hours": 1}
            },
            {
                "name": "AVR_1_2",
                "treatment": "AVR",
                "$$hashKey": "00F",
                "repetition": 2,
                "time": {"hours": 1}
            },
            {
                "name": "VIR_1_2",
                "treatment": "VIR",
                "$$hashKey": "00G",
                "repetition": 2,
                "time": {"hours": 1}
            },
            {
                "name": "MOCK_6_2",
                "treatment": "MOCK",
                "$$hashKey": "00H",
                "repetition": 2,
                "time": {"hours": 6}
            },
            {
                "name": "AVR_6_2",
                "treatment": "AVR",
                "$$hashKey": "00I",
                "repetition": 2,
                "time": {"hours": 6}
            },
            {
                "name": "VIR_6_2",
                "treatment": "VIR",
                "$$hashKey": "00J",
                "repetition": 2,
                "time": {"hours": 6}
            },
            {
                "name": "MOCK_12_2",
                "treatment": "MOCK",
                "$$hashKey": "00K",
                "repetition": 2,
                "time": {"hours": 12}
            },
            {
                "name": "AVR_12_2",
                "treatment": "AVR",
                "$$hashKey": "00L",
                "repetition": 2,
                "time": {"hours": 12}
            },
            {
                "name": "VIR_12_2",
                "treatment": "VIR",
                "$$hashKey": "00M",
                "repetition": 2,
                "time": {"hours": 12}
            }
        ];
        $scope.checkCompletion();
    };
    $scope.changeLayout = function (result) {
        result.cy.layout({ name: result.selectedLayout.value});
//        console.log('changeLayout', result);
    };
    $scope.changeEdgeColor = function (result) {
        result.cy.style().selector('edge').css('line-color', result.selectedEdgeColor.value).update();
        result.cy.style().selector('edge').css('target-arrow-color', result.selectedEdgeColor.value).update();
//        console.log('changeEdgeColor', result);
    };
    $scope.changeNodeColor = function (result) {
        result.currentNodeColor = result.selectedNodeColor.value;
        result.cy.style().selector('node').css('background-color', result.selectedNodeColor.value).update();
        result.nodeColorByDegree();
//        console.log('changeNodeColor', result);
    };

    $scope.sizeByDegree = function (result) {
        console.log(result.sizeByDegreeToggle);
        if (result.sizeByDegreeToggle) {
            var map = 'mapData(weight, ' + result.smallestNode + ', ' + result.largestNode + ', ' + result.minNodeSize + ', ' + result.maxNodeSize + ')';
            result.cy.style().selector('node').css('width', map).css('height', map).update();
        } else {
            result.cy.style().selector('node').css('width', result.defaultNodeWidth).css('height', result.defaultNodeHeight).update();
        }
    };

    $scope.colorByDegree = function (result) {
        console.log(result.colorByDegreeToggle);
        if (result.colorByDegreeToggle) {
            result.nodeColorByDegree();
        } else {
            result.cy.style().selector('node').css('background-color', result.currentNodeColor).update();
        }
    };

    $scope.cyToPng = function (result) {
        var png = result.cy.png();
    };
    $scope.cyToJSON = function (result) {
        var json = result.cy.json();
    };
}]);

