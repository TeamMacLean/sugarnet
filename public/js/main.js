var app = angular.module('rotool', []);

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

    $scope.otherOptions = ['gene ID', 'unused'];

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
            _.pull($scope.headers, header);
            $scope.treatments.push(header);

            $scope.reloadDefineOptions();
        }
    };

    $scope.removeTreatment = function (treatment) {
        if (_.contains($scope.treatments, treatment)) {
            _.pull($scope.treatments, treatment);
            $scope.headers.push(treatment);

            $scope.reloadDefineOptions();
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
                console.log(d);
                $scope.headers = d;
                $scope.reloadDefineOptions();
            });
    };

}])
;