var tour;

/**
 *
 * @type {module|*}
 */
var app = angular.module('rotool', []);


// Just pretend this is not here, ok?

app.directive('fileInput', ['$parse', function ($parse) {
  return {
    restrict: 'A',
    link: function (scope, elm, attrs) {
      elm.bind('change', function () {
        tour.next();
        $parse(attrs.fileInput)
          .assign(scope, elm[0].files);
        scope.$apply();
      })
    }
  }
}]);

// This does all the stuff, apart from the bit above, but we don't talk about that.
app.controller('checkController', ['$scope', '$http', function ($scope, $http) {
  $scope.sessionID = null;
  $scope.headers = [];
  $scope.treatments = [];
  $scope.otherOptions = ['ID', 'UNUSED'];
  $scope.defineOptions = [];
  $scope.musicPlaying = false;
  $scope.files = [];
  $scope.devMode = false;
  $scope.musicOn = false;
  $scope.resultBlocks = [];
  $scope.ResultBlocksOriginal = [];
  $scope.typedFirstTreatment = false;
  $scope.addedFirstTreatment = false;

  $scope.showGuide = true;


  $scope.enableGuide = function () {
    $scope.showGuide = 'true';
    tour.show();
    $('#guide-toggle').text('disable guide');
    if ($scope.supports_html5_storage()) {
      localStorage.setItem("showGuide", 'true');
    }
  };
  $scope.disableGuide = function () {
    $scope.showGuide = 'false';
    tour.hide();
    $('#guide-toggle').text('enable guide');
    if ($scope.supports_html5_storage()) {
      localStorage.setItem("showGuide", 'false');
    }
  };
  $scope.toggleGuide = function () {
    if ($scope.showGuide == 'true') {
      $scope.disableGuide();
    } else {
      $scope.enableGuide();

    }
  };

  $scope.supports_html5_storage = function () {
    try {
      return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
      return false;
    }
  };

  $scope.typingFirstTreatment = function () {
    if (!$scope.typedFirstTreatment) {
      tour.next();
      $scope.typedFirstTreatment = true;
    }
  };

  $scope.reloadDefineOptions = function () {
    $scope.defineOptions = $scope.otherOptions.concat($scope.treatments);
  };

  $scope.filesChanged = function (elm) {
    $scope.files = elm.files;
    $scope.$apply();
  };

  $scope.addTreatment = function (header) {
    if (!_.contains($scope.treatments, header) && !_.isEmpty(header)) {

      if (!$scope.addedFirstTreatment) {
        tour.next();
        $scope.addedFirstTreatment = true;
      }

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
    $('#musicPlayer').hide();
    toggleMusic();
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
          tour.next();
        })
        .error(function () {
          toggleUploadLoading();
        });
    }
  };

  $scope.checkCompletion = function () {

    //TODO disable ID + unused inputs
    _.forEach($scope.headers, function (header) {

      console.log('checking headers');

    });

    if (!_.isEmpty($scope.files)) {
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
      swal("Oops...", "No file found!", "error");
    }
  };

  var toggleMusic = function () {
    if ($scope.musicOn) {
      if ($scope.musicPlaying) {
        $('#music').trigger("pause");
        $scope.musicPlaying = false;
      } else {
        $('#music').trigger("play");
        $scope.musicPlaying = true;
      }
    }
  };

  var toggleResultsView = function () {
    toggleMusic();
    $('#stepOne').hide();
    $('#stepTwo').hide();
    $('#stepThree').hide();
    $('#results').show();
  };

//    TODO this for time and repetitions too!
  var headerEql = function (array, checker) {
    console.log('checking headers', checker);
    var headers = array;
    if ($scope.devMode) {
      console.log('DEV', headers);
    }
    var table = {};
    headers.forEach(function (header) {
      if (header[checker] && $scope.otherOptions.indexOf(header[checker]) == -1) {
        if (table[header[checker]]) {
          table[header[checker]] += 1;
        } else {
          table[header[checker]] = 1;
        }
      }
    });
    console.log(table);
    var first;
    for (var value in table) {
      if (!first) {
        first = table[value];
      }
      if (table[value] !== first) {
        swal("This will fail!", 'There are not an equal amount of data for each treatment', 'error');
        return false;
      }
    }
    return true;
  };

  var postIt = function () {
    var headers = $scope.headers;
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

  $scope.getResults = function () {
    if (headerEql($scope.headers, 'treatment')
      &&
      headerEql($scope.headers, 'repetition')
      &&
      headerEql($scope.headers, 'time')) {
      postIt();
      tour.complete();
    }
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
    thisBlock.lowestEdgeCount = 99999999999;
    thisBlock.highestEdgeCount = 0;

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

    thisBlock.defaultNodeColor = thisBlock.nodeColors[1];
    thisBlock.defaultEdgeColor = thisBlock.edgeColors[2];
    thisBlock.defaultLayout = thisBlock.layoutOptions[2];


    thisBlock.selectedNodeColor = thisBlock.defaultNodeColor;
    thisBlock.selectedEdgeColor = thisBlock.defaultEdgeColor;
    thisBlock.selectedLayout = thisBlock.defaultLayout;

    thisBlock.layout = {
      name: thisBlock.defaultLayout.value,
      padding: 10
    };

    thisBlock.nodeCSS = {
      'width': thisBlock.defaultNodeWidth,
      'height': thisBlock.defaultNodeHeight,
      'content': 'data(name)',
      'background-color': thisBlock.defaultNodeColor.value

    };

    thisBlock.edgeCSS = {
      'width': '2',
      'target-arrow-shape': 'triangle',
      'line-color': thisBlock.defaultEdgeColor.value,
      'target-arrow-color': thisBlock.defaultEdgeColor.value
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

    thisBlock.nodes = [];
    thisBlock.edges = [];

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
              thisBlock.edges.push(edge);

              var foundNode = _.where(thisBlock.nodes, {data: {id: node1}});
              var foundNodeTwo = _.where(thisBlock.nodes, {data: {id: node2}});

              if (_.isEmpty(foundNode)) {
                var nameA = names[node1Int - 1]; //start from 0
                var nodeA = {data: {id: node1, name: nameA}};
                thisBlock.nodes.push(nodeA);
              }
              if (_.isEmpty(foundNodeTwo)) {
                var nameB = names[node2Int - 1]; //start from 0
                var nodeB = {data: {id: node2, name: nameB}};
                thisBlock.nodes.push(nodeB);
              }
            });

//                TODO tell node about its connection count
            _.forEach(thisBlock.nodes, function (node) {
              var count1 = _.where(thisBlock.edges, {data: {source: node.data.id}}).length;
              var count2 = _.where(thisBlock.edges, {data: {target: node.data.id}}).length;

              var count = count1 + count2;
              if (count > thisBlock.highestEdgeCount) {
                thisBlock.highestEdgeCount = count;
              }
              if (count < thisBlock.lowestEdgeCount) {
                thisBlock.lowestEdgeCount = count;
              }
              node.data.weight = count;
            });


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
                nodes: thisBlock.nodes,
                edges: thisBlock.edges
              },

              layout: thisBlock.layout
            });

            $(window).resize(function () {
              cy.resize();
            });
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

    if (result.length < 1) {
      swal("Oops...", 'No results received', "error");
    }

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
        thisBlock.showEdgeCount = false;

        thisBlock.sizeByDegreeToggle = false;
        thisBlock.colorByDegreeToggle = false;
        injectGraph(thisBlock, function (out) {
          thisBlock.cy = out;


          function compare(a, b) {
            if (a.data.weight < b.data.weight) {
              return 1;
            }
            if (a.data.weight > b.data.weight) {
              return -1;
            }
            return 0;
          }

          thisBlock.nodes.sort(compare);
          thisBlock.topNodeCount = thisBlock.nodes.length;
          thisBlock.nodeCount = thisBlock.topNodeCount;

          thisBlock.nodeColorByDegree = function () {
            if (thisBlock.colorByDegreeToggle) {
              var lighterColor = ColorLuminance(thisBlock.selectedNodeColor.value, -0.50);
              var darkerColor = ColorLuminance(thisBlock.selectedNodeColor.value, 0.50);
              var map = 'mapData(weight, ' + thisBlock.lowestEdgeCount + ', ' + thisBlock.highestEdgeCount + ', ' + lighterColor + ', ' + darkerColor + ')';
              console.log('updated color');
              thisBlock.cy.style().selector('node').css('background-color', map).update();
            }
          };
        });
        $scope.resultBlocks.push(thisBlock);
      });
      toggleResultLoading();
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

  /**
   *
   * @param result
   */
  $scope.changeLayout = function (result) {
    result.cy.layout({name: result.selectedLayout.value});
  };

  /**
   *
   * @param result
   */
  $scope.changeEdgeColor = function (result) {
    result.cy.style().selector('edge').css('line-color', result.selectedEdgeColor.value).update();
    result.cy.style().selector('edge').css('target-arrow-color', result.selectedEdgeColor.value).update();
  };

  /**
   *
   * @param result
   */
  $scope.changeNodeColor = function (result) {
    result.cy.style().selector('node').css('background-color', result.selectedNodeColor.value).update();
    result.nodeColorByDegree();
  };

  /**
   *
   * @param result
   */
  $scope.sizeByDegree = function (result) {
    if (result.sizeByDegreeToggle) {
      var map = 'mapData(weight, ' + result.lowestEdgeCount + ', ' + result.highestEdgeCount + ', ' + result.minNodeSize + ', ' + result.maxNodeSize + ')';
      result.cy.style().selector('node').css('width', map).css('height', map).update();
    } else {
      result.cy.style().selector('node').css('width', result.defaultNodeWidth).css('height', result.defaultNodeHeight).update();
    }
  };

  /**
   *
   * @param result
   */
  $scope.topNodes = function (result) {
    var citrus = result.nodes.slice(0, result.topNodeCount);

    result.cy.load({
      nodes: citrus,
      edges: result.edges
    }, function () {
      result.cy.layout({name: result.selectedLayout.value});
    });
  };

  /**
   *
   * @param result
   */
  $scope.edgesToShow = function (result) {
    console.log(result);
    swal("I SAID NOT TO USE IT!", "", "warning");
  };

  /**
   *
   * @param result
   */
  $scope.toggleEdgeCount = function (result) {
    if (result.showEdgeCount) {
      result.cy.style().selector('node').css('content', 'data(weight)').update()
    } else {
      result.cy.style().selector('node').css('content', 'data(name)').update()
    }
  };

  /**
   *
   * @param result
   */
  $scope.colorByDegree = function (result) {
    if (result.colorByDegreeToggle) {
      result.nodeColorByDegree();
    } else {
      result.cy.style().selector('node').css('background-color', result.selectedNodeColor.value).update();
    }
  };

  /**
   *
   * @param result
   */
  $scope.cyToPng = function (result) {
    var png = result.cy.png();
    var byteString = png.split(',')[1];
    var binary = atob(byteString);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var file = new Blob([view.buffer]);
    saveAs(file, 'graph-' + result.id + '.png');
  };

  /**
   *
   * @param result
   */
  $scope.cyToJSON = function (result) {


    result.edges.forEach(function (edge) {

//            FROM INTER TO
//            "edge.data.source edge.data.pp edge.data.target"

    });

    console.log(result.cy.json());

//        var out = result.edges;
//        console.log(result);
//        var string = JSON.stringify(out, null, '\t');
//        var blob = new Blob([string], {type: "application/json"});
//        saveAs(blob, 'graph-' + result.id + '.json');
  };


  $scope.cyToSif = function (result) {


  };

//    this is just for fun
  var animateString = 'rubberBand';
  $('#logo').find('img').hover(function () {
    $(this).addClass('animated ' + animateString);
  }).bind("animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd", function () {
    $(this).removeClass('animated ' + animateString);
  });

  $('#musicPlayer').click(function () {
    var player = $('#musicPlayer');
    player.toggleClass('fa-pause');
    player.toggleClass('fa-play');
    toggleMusic();
  });


//shepherd
  $(document).ready(function () {

    tour = new Shepherd.Tour({
      defaults: {classes: 'shepherd-theme-arrows'},
      scrollTo: true
    });


    tour.addStep('CSV File', {
      text: 'This should be your gene experssion data',
      attachTo: '#stepOne > div > div.form-inline > div > input right',
      buttons: [
        {
          text: 'hide guide!',
          action: $scope.disableGuide
        }
      ]
    });
    tour.addStep('Upload', {
      text: 'Hit upload',
      attachTo: '#stepOne > div > div.form-inline > div > button bottom',
      buttons: []
    });
    tour.addStep('Name Treatments', {
      text: 'You should now categorise and group your expression data. \nType your first sample/treatment catefory name into the box and click add. \nYou do not need to add to add time point information.',
      attachTo: '#stepTwo > div > form > input right',
      buttons: []
    });
    tour.addStep('Add it to the list', {
      text: 'Add it to the list',
      attachTo: '#stepTwo > div > form > button bottom',
      buttons: []
    });

    tour.addStep('Repeat for all treatments', {
      text: 'Repeat this for all treatments',
      attachTo: '#stepTwo > div bottom',
      buttons: [
        {
          text: 'next',
          action: tour.next
        }
      ]
    });

    tour.addStep('Set it colum (required)', {
      text: 'Set ONE colum as the ID (required)',
      attachTo: ' #dataExplainHelp > div:nth-child(2) > h4 top',
      buttons: [
        {
          text: 'next',
          action: tour.next
        }
      ]
    });

    tour.addStep('Fill out form', {
      text: 'Now tell PiNet which columns are which. \nClick the "Treatment/Sample" dropdown and pick the category for each column name. \nYou should add gene/probe/tag names as "ID". Select "Unused" if that colum should be ignored. \n\nNext add the replicate number for each column. \n\nFinally add the time point infomation for eact treatment/sample',
      attachTo: ' #dataExplainHelp > div:nth-child(2) > h4 top',
      buttons: [
        {
          text: 'next',
          action: tour.next
        }
      ]
    });


    tour.addStep('Submit', {
      text: 'Submit',
      attachTo: '#stepThree > div > button.btn.btn-default bottom',
      buttons: []
    });

    if ($scope.supports_html5_storage()) {
      $scope.showGuide = localStorage.getItem("showGuide");
      console.log('at start', $scope.showGuide);

      tour.start();

      if ($scope.showGuide == 'false') {
        $('#guide-toggle').text('enable guide');
        tour.hide();
      } else {
        $('#guide-toggle').text('disable guide');
      }
    }
  })
}]);




