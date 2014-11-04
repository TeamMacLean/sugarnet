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


    $scope.devMode = true;

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
        $('#upload-spinner').toggle();
    };

    var toggleResultLoading = function () {
        $('#result-spinner').toggle();
    };

    $scope.upload = function () {
        var fd = new FormData();

        if ($scope.files.length < 1) {
            console.log('no files');
            return;
        }
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

    };

    $scope.checkCompletion = function () {

        if (!_.isEmpty($scope.headers)) {
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
        } else {
            console.log('no headers loaded');
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
                    $scope.processResults(d);
                })
                .error(function (err) {
                    toggleResultsView();
                    console.log('error', err);
                });
        };
        postIt($scope.headers);
    };

    var makeid = function () {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 8; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    };

    var injectGraph = function (network, names, cb) {

        var tmpID = makeid();
        var newDiv = $('<div></div>');
        newDiv.attr('id', tmpID).addClass('mb');
        $('<h3>Click to load interactive graph</h3>').addClass('cyText').appendTo(newDiv);
        newDiv.appendTo('#results');
        newDiv.click(function () {

            if (!newDiv.hasClass('cy')) {
                newDiv.addClass('cy');
                newDiv.find('h3').remove();

                var nodes = [];
                var edges = [];

                _.forEach(network, function (ob) {
                    var node1Int = ob.node1;
                    var node2Int = ob.node2;
                    var node1 = node1Int.toString();
                    var node2 = node2Int.toString();
                    var newID = node1 + '' + node2;


                    var weight = ob['qval.dir'].toString();

                    var edge = {data: {id: newID, weight: weight, source: node1, target: node2}};
                    edges.push(edge);

                    var foundNode = _.where(nodes, {data: { id: node1 }});
                    var foundNodeTwo = _.where(nodes, {data: { id: node2 }});

                    if (_.isEmpty(foundNode)) {
                        var name = names[node1Int - 1]; //start from 0
                        var nodeA = {data: {id: node1, name: name}};
                        nodes.push(nodeA);
                    }
                    if (_.isEmpty(foundNodeTwo)) {
                        var name = names[node2Int - 1]; //start from 0
                        var nodeB = {data: {id: node2, name: name}};
                        nodes.push(nodeB);
                    }
                });


                var cy = cytoscape({
                    container: document.getElementById(tmpID),

                    style: cytoscape.stylesheet()
                        .selector('node')
                        .css({
                            'content': 'data(name)',
                            'background-color': '#1ABC9C'
                        })
                        .selector('edge')
                        .css({
                            'width': '2',
                            'target-arrow-shape': 'triangle',
                            'line-color': '#F1C40F',
                            'target-arrow-color': '#F1C40F'
                        })
                        .selector('.highlighted')
                        .css({
                            'background-color': '#ECF0F1',
                            'line-color': '#ECF0F1',
                            'target-arrow-color': '#61bffc',
                            'transition-property': 'background-color, line-color, target-arrow-color',
                            'transition-duration': '0.5s'
                        }),

                    elements: {
                        nodes: nodes,
                        edges: edges
                    },

                    layout: {
                        name: 'cose',
                        padding: 10
                    }
                });
            }
        });
        cb();
    };

    var processNetwork = function (json, njson, cb) {
        $.getJSON(json, function (network) {
            $.getJSON(njson, function (names) {
                injectGraph(network, names, cb);
            });
        });
    };

    $scope.processResults = function (result) {

        //result should already be parsed json (angular does it by its self)

        if ($scope.devMode) {
            console.log('results:', result);
        }

        if (result) {

            var currentJsonPath = '';

            async.eachSeries(result, function (res, callback) {

                if (res.indexOf("public") > -1) {

                    var path = res.split('public').pop();
                    var fileType = path.split('.').pop();

                    if (fileType == 'jpeg') {
                        $('<img src="' + path + '">').load(function () {
                            $(this).addClass('img-responsive').addClass('centerImage').addClass('mb').appendTo('#results');
                            callback();
                        })
                    }
                    else if (fileType == 'json') {
                        currentJsonPath = path;
                        callback();
                    }
                    else if (fileType == 'njson') {
                        processNetwork(currentJsonPath, path, callback);
                    }
                    else if (fileType == 'txt') {
                        $('<h2><a href="' + path + '" target="_blank">Edges</a></h2>').addClass('centerText').addClass('mb').appendTo('#results');
                        callback();
                    } else {
                        callback();
                    }
                } else {
                    $('<h1>' + res + '</h1>').addClass('centerText').addClass('mb').appendTo('#results');
                    callback();
                }
            }, function () {
                toggleResultLoading();
            });
        } else {
            $('<h1>There was an error.</h1>').appendTo('#results');
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
}])
;

