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
    $scope.otherOptions = ['ID', 'unused'];
    $scope.defineOptions = [];

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

    $scope.upload = function () {
        var fd = new FormData();
        angular.forEach($scope.files, function (file) {
            fd.append('file', file)
        });
        $http.post('uploadCSV', fd, {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        })
            .success(function (d) {
                _.forEach(d, function (item) {
                    var head = {name: item, treatment: undefined};
                    $scope.headers.push(head);
                });
                $scope.reloadDefineOptions();
                $('#dataExplainHelp').show();
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

    $scope.getResults = function () {

        var postIt = function (headers) {
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
//                TODO SHOULD GET A BUNCH OF URLS FOR IMAGES IN RETURN
                    console.log('POSTED');
                    console.log(d);
                });
        };

        var filteredHeaders = [];
        var haveGeneID = false;
        _.forEach($scope.headers, function (header) {
            if (header.treatment == $scope.otherOptions[0]) {
                if (haveGeneID) {
//                    TODO error out, do not send
                } else {
                    haveGeneID = true;
                }
            }
//            skip 'unused'
            if (header.treatment != $scope.otherOptions[1]) {
                filteredHeaders.push(header);
            }
        });
        console.log(filteredHeaders);
        postIt(filteredHeaders);
    };


    $scope.fillOptions = function () {
        _.forEach($scope.headers, function (head) {
            head.treatment = $scope.defineOptions[1];
        });
        $scope.checkCompletion();
    }

}]);

