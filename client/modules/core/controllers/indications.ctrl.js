'use strict';

angular.module('com.module.core')
.controller('IndicationsCtrl', IndicationsCtrl);

function IndicationsCtrl($scope, SocialMediaPost, $q) {
  $scope.posts = [];
  $scope.broadcastCounts;
  $scope.aggCounts = [];
  $scope.clusterText = '';
  $scope.clusterTerm = '';
  $scope.interval = 1440;
  $scope.windowCount = 7;
  $scope.terms = ["assad","missile","syria","putin"];
  $scope.removeTerm = function(term){
    $scope.terms.splice($scope.terms.indexOf(term),1);
  };
  $scope.addTerm = function(term){
    if($scope.terms.indexOf(term) >=0)return;
    $scope.terms.push(term);
  };

  $scope.forPosts= function(posts) {
    $scope.posts = _(posts).orderBy(p => p.screen_name.toLowerCase()).value();
    createPostsCharts(posts);
  };


  $scope.createPostsCharts = function(posts) {
    let counts = posts.reduce((acc, curr) => {
      // broadcast wins if also a quote
      if (curr.broadcast_post_id)
        acc['broadcast']++
      else if (curr.quote_post_id)
        acc['quote']++
      else if (curr.reply_to_post_id)
        acc['reply']++
      else
        acc['direct']++

      return acc;
    }, {quote: 0, broadcast: 0, reply: 0, direct: 0});

    $scope.postTypeCounts = [
      {label: 'quote', value: counts['quote']},
      {label: 'retweet', value: counts['broadcast']},
      {label: 'reply', value: counts['reply']},
      {label: 'direct', value: counts['direct']}
    ];
    $scope.postTypeConf = [
      {path: 'header.title.text', value: 'post types'}
    ];

    // broadcast + quote
    let refs = _(posts)
      .map(p => p.broadcast_post_id || p.quote_post_id)
      .compact().uniq().value();

    $scope.aggCounts = [
      {label: 'referred to', value: refs.length}
    ];

    // just broadcast
    let broadcasts = _(posts)
      .map('broadcast_post_id')
      .compact().value();

    // first create a map of counts
    let broadcastCountByKey = broadcasts.reduce((acc, curr) => {
      acc[curr] ? acc[curr]++ : acc[curr] = 1;
      return acc;
    }, {});

    // then reduce to a ui-friendly, sorted list
    $scope.broadcastCounts = Object.keys(broadcastCountByKey)
      .reduce((acc, curr) => {
        acc.push({label: curr, value: broadcastCountByKey[curr]});
        return acc;
      }, []);
    $scope.broadcastCounts = _.orderBy($scope.broadcastCounts, 'value', 'desc').slice(0,10);
  };

  $scope.dateSelected = function(data) {
    $scope.showSpinner = true;
    SocialMediaPost.find({
      filter: {
        where: {
          lang: 'en',
          featurizer: 'text',
          text: {like: data.term},
          timestamp_ms: {between: [data.window.startTime, data.window.endTime]}
        }
      }
    }).$promise.then(results => {
      $scope.posts = results;
      $scope.createPostsCharts(results);
    }).then(function() {
      $scope.showSpinner = false;
    })
      .catch(console.error);

  };

}