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
        console.log($scope);
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

    toggleUploadLoading = function(){
        $('#upload-spinner').toggle();
    };

    $scope.upload = function () {
        var fd = new FormData();
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
            .error(function(){
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
        $('#stepOne').toggle();
        $('#stepTwo').toggle();
        $('#stepThree').toggle();
        $('#results').toggle();


    };

    $scope.getResults = function () {

        var postIt = function (headers) {

            console.log('posting: ', headers);

            toggleResultsView();


            var fd = new FormData();

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
                    toggleResultsView();
                    // TODO SHOULD GET A BUNCH OF URLS FOR IMAGES IN RETURN
                    console.log('success');
                    console.log(d);
                })
                .error(function (d) {
                    toggleResultsView();
                    console.log('error');
                    console.log(d);
                });
        };

        postIt($scope.headers);
    };


    $scope.fillOptions = function () {
        _.forEach($scope.headers, function (head) {
            head.treatment = $scope.defineOptions[1];
        });
        $scope.checkCompletion();
    };

    $scope.devFill = function(){
        $scope.treatments = ['MOCK', 'AVR', 'VIR'];
        $scope.reloadDefineOptions();
        $scope.headers = [{"name":"gene_id","treatment":"UNUSED","$$hashKey":"003"},{"name":"tracking_id","treatment":"ID","$$hashKey":"004"},{"name":"MOCK_1_1","treatment":"MOCK","$$hashKey":"005","repetition":1,"time":{"hours":1}},{"name":"AVR_1_1","treatment":"AVR","$$hashKey":"006","repetition":1,"time":{"hours":1}},{"name":"VIR_1_1","treatment":"VIR","$$hashKey":"007","repetition":1,"time":{"hours":1}},{"name":"MOCK_6_1","treatment":"MOCK","$$hashKey":"008","repetition":1,"time":{"hours":6}},{"name":"AVR_6_1","treatment":"AVR","$$hashKey":"009","repetition":1,"time":{"hours":6}},{"name":"VIR_6_1","treatment":"VIR","$$hashKey":"00A","repetition":1,"time":{"hours":6}},{"name":"MOCK_12_1","treatment":"MOCK","$$hashKey":"00B","repetition":1,"time":{"hours":12}},{"name":"AVR_12_1","treatment":"AVR","$$hashKey":"00C","repetition":1,"time":{"hours":12}},{"name":"VIR_12_1","treatment":"VIR","$$hashKey":"00D","repetition":1,"time":{"hours":12}},{"name":"MOCK_1_2","treatment":"MOCK","$$hashKey":"00E","repetition":2,"time":{"hours":1}},{"name":"AVR_1_2","treatment":"AVR","$$hashKey":"00F","repetition":2,"time":{"hours":1}},{"name":"VIR_1_2","treatment":"VIR","$$hashKey":"00G","repetition":2,"time":{"hours":1}},{"name":"MOCK_6_2","treatment":"MOCK","$$hashKey":"00H","repetition":2,"time":{"hours":6}},{"name":"AVR_6_2","treatment":"AVR","$$hashKey":"00I","repetition":2,"time":{"hours":6}},{"name":"VIR_6_2","treatment":"VIR","$$hashKey":"00J","repetition":2,"time":{"hours":6}},{"name":"MOCK_12_2","treatment":"MOCK","$$hashKey":"00K","repetition":2,"time":{"hours":12}},{"name":"AVR_12_2","treatment":"AVR","$$hashKey":"00L","repetition":2,"time":{"hours":12}},{"name":"VIR_12_2","treatment":"VIR","$$hashKey":"00M","repetition":2,"time":{"hours":12}}]
        $scope.checkCompletion();
    }


}]);

