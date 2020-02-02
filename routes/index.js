var express = require('express');
var moment = require('moment')
var router = express.Router();
const mysql = require('mysql');
const winston = require('../config/winston')
const connection = mysql.createConnection({
  host:'localhost',
  user:'thon20',
  password:'DIkBfuS0r3',
  database:'semicolon',
  multipleStatements: true
});

connection.connect();

function isEmpty(value){
  if ( value == "" || value == null || value == undefined || ( value != null && typeof value == "object" && !Object.keys(value).length ) ){
      return true
  } else return false
};


router.get('/', function(req, res, next) {
  if(isEmpty(req.session.userid)) {
    res.statusCode = 302;
    res.setHeader('Location', '/login');
    res.end();
    return;
  } else {
    connection.query('SELECT * FROM members WHERE id=?', [req.session.userid], function (error, results, fields) {
      if (error) {
        console.log(error);
      } 
      winston.info("서비스 접속 - " + req.session.userid + '(id)');
      res.render('index', { page: "home", user: results});
    });
  } 
});

router.get('/notices', function(req, res, next) {
  if(isEmpty(req.session.userid)) {
    res.statusCode = 302;
    res.setHeader('Location', '/login');
    res.end();
    return;
  } else {
    connection.query('SELECT * FROM members WHERE id=?', [req.session.userid], function (error, results_member, fields) {
      if (error) {
        console.log(error);
      }
			connection.query('SELECT * FROM notice', function (error, results_notices, fields) {
				if (error) {
        console.log(error);
    	  } 
				res.render('index', { page: "notices", user: results_member, notices: results_notices });
			});
    });
  } 
});

router.get('/noticesad', function(req, res, next) {
  if(req.session.isadmin == true) {
    if(isEmpty(req.session.userid)) {
      res.statusCode = 302;
      res.setHeader('Location', '/login');
      res.end();
      return;
    } else {
      connection.query('SELECT * FROM members WHERE id=?', [req.session.userid], function (error, results_member, fields) {
        if (error) {
          console.log(error);
        }
        connection.query('SELECT * FROM notice', function (error, results_notices, fields) {
          if (error) {
            console.log(error);
          } 
          res.render('index', { page: "noticesad", user: [{name:'IAM_USER_ADMIN', isadmin:1}], notices: results_notices });
        });
      });
    } 
  } else {
    res.render('err', {err:'auth'});
  }
});

/* 보안을 위해 Mysql 외부접속 해제
router.get('/support', function(req, res, next) {
  if(isEmpty(req.session.userid)) {
    res.statusCode = 302;
    res.setHeader('Location', '/login');
    res.end();
    return;
  } else {
    connection.query('SELECT * FROM support', function (error, results, fields) {
      if (error) {
        console.log(error);
      }
				res.render('index', { page: "support", user: [{name:'Admin', isadmin:1}], supports:results });
    });
  } 
});
*/

router.get('/license', function(req, res, next) {
	res.render('index', { page: "license", user: [{name:'IAM_USER_LICENSE'}]});
});

router.get('/log', function(req, res, next) {
  if(req.session.isadmin == true) {
    res.render('log');
    return;
  } else {
    res.render('err', {err:'auth'});
  }
});

router.get('/teams', function(req, res, next) {
  if(req.session.isadmin == true) {
    var membersI=[];
    if(isEmpty(req.session.userid)) {
      res.statusCode = 302;
      res.setHeader('Location', '/login');
      res.end();
      return;
    } else {
      connection.query('SELECT * FROM members', function (error, results_member, fields) {
        if (error) {
          console.log(error);
        } 
        for(i=0; i<results_member.length; i++) membersI[results_member[i].id] = results_member[i];
        connection.query('SELECT * FROM teams', function (error, results_team, fields) {
          if (error) {
            console.log(error);
          } 
          res.render('index', { page: "teams", membersI: membersI, teams:results_team, user: [{name:'IAM_USER_ADMIN', isadmin:1}]});
        });
      });
    } 
  } else {
    res.render('err', {err:'auth'});
  }
});

router.get('/members', function(req, res, next) {
  var teamsI=[];
  if(req.session.isadmin == true) {
    if(isEmpty(req.session.userid)) {
      res.statusCode = 302;
      res.setHeader('Location', '/login');
      res.end();
      return;
    } else {
      connection.query('SELECT * FROM members', function (error, results_member, fields) {
        if (error) {
          console.log(error);
        } 
        connection.query('SELECT * FROM teams', function (error, results_team, fields) {
          for(i=0; i<results_team.length; i++) teamsI[results_team[i].id] = results_team[i];
          if (error) {
            console.log(error);
          } 
          res.render('index', { page: "members", members: results_member, teamsI:teamsI, teamInfo: results_team, user: [{name:'IAM_USER_ADMIN', isadmin:1}], gradeInfo:['중등 1(13)', '중등 2(14)', '중등 3(15)', '고등 1(16)', '고등 2(17)', '고등 3(18)', '대학생']});
        });
      });
    } 
  } else {
    res.render('err', {err:'auth'});
  }
});

router.get('/team', function(req, res, next) {
  if(isEmpty(req.session.userid)) {
    res.statusCode = 302;
    res.setHeader('Location', '/login');
    res.end();
    return;
  } else {
    connection.query('SELECT * FROM members WHERE id=?', [req.session.userid], function (error, results_member, fields) {
      if (error) {
        console.log(error);
      } 
      if(!isEmpty(results_member[0].team)) {
        connection.query('SELECT * FROM teams WHERE id=?', [results_member[0].team], function (error, results_team, fields) {
          if (error) {
            console.log(error);
          }
          connection.query('SELECT * FROM members WHERE team=?', [results_member[0].team], function (error, results_party, fields) {
            if (error) {
              console.log(error);
            } 
            res.render('index', { page: "teamm", user: results_member, team_data: results_team, party_data: results_party});
          });
        });
      } else {
        res.render('index', { page: "team", user: results_member, username: results_member[0].name}); //화이팅!
      }
    });
  }
});

router.get('/doc', function(req, res, next) {
  if(isEmpty(req.session.userid)) {
    res.statusCode = 302;
    res.setHeader('Location', '/login');
    res.end();
    return;
  } else {
    connection.query('SELECT * FROM teams WHERE id=?', [req.query.team], function (error, results_team, fields) {
      if (error) {
        console.log(error);
      }
      connection.query('SELECT * FROM members WHERE team=?', [req.query.team], function (error, results_party, fields) {
        if (error) {
          console.log(error);
        } 
        res.render('index', { page: "teamm", user: [{name:'IAM_USER_VIEWONLY'}], team_data: results_team, party_data: results_party});
      });
    });
  }
});

router.get('/jdresultm', function(req, res, next) {
	var team_info=[];
  if(isEmpty(req.session.userid)) {
    res.statusCode = 302;
    res.setHeader('Location', '/login');
    res.end();
    return;
  } else {
    connection.query('SELECT * FROM members WHERE id=?', [req.session.userid], function (error, results_member, fields) {
      if (error) {
        console.log(error);
      }
			connection.query('SELECT * FROM resultm', function (error, results_jdresultm, fields) {
				if (error) {
        console.log(error);
    	  }
				if(results_jdresultm[0].team_id==0||results_jdresultm[1].team_id==0||results_jdresultm[2].team_id==0) {
					res.render('index', { page: "jdresultm", user: results_member, no:"1"});
				} else {
				connection.query('SELECT * FROM teams WHERE id=?', [results_jdresultm[0].team_id], function (error, aresults_party, fields) {
					connection.query('SELECT * FROM teams WHERE id=?', [results_jdresultm[1].team_id], function (error, bresults_party, fields) {
						connection.query('SELECT * FROM teams WHERE id=?', [results_jdresultm[2].team_id], function (error, cresults_party, fields) {
							connection.query('SELECT * FROM members WHERE id=?', [aresults_party[0].leader], function (error, aresults_leader, fields) {
								connection.query('SELECT * FROM members WHERE id=?', [bresults_party[0].leader], function (error, bresults_leader, fields) {
									connection.query('SELECT * FROM members WHERE id=?', [cresults_party[0].leader], function (error, cresults_leader, fields) {
										connection.query('SELECT * FROM members WHERE team=?', [aresults_party[0].id], function (error, aresults_teammember, fields) {
											connection.query('SELECT * FROM members WHERE team=?', [bresults_party[0].id], function (error, bresults_teammember, fields) {
												connection.query('SELECT * FROM members WHERE team=?', [cresults_party[0].id], function (error, cresults_teammember, fields) {
										res.render('index', { page: "jdresultm", user: results_member, resultm: results_jdresultm, ateaminfo: aresults_party, bteaminfo: bresults_party, cteaminfo: cresults_party, ateamleader: aresults_leader, bteamleader: bresults_leader, cteamleader: cresults_leader, amembers: aresults_teammember, bmembers: bresults_teammember, cmembers: cresults_teammember, no:"0"});
												});
											});
										});
									});
								});
							});
						});
					});
				});
				}
			});
    });
  } 
});

router.get('/jdresulth', function(req, res, next) {
	var team_info=[];
  if(isEmpty(req.session.userid)) {
    res.statusCode = 302;
    res.setHeader('Location', '/login');
    res.end();
    return;
  } else {
    connection.query('SELECT * FROM members WHERE id=?', [req.session.userid], function (error, results_member, fields) {
      if (error) {
        console.log(error);
      }
			connection.query('SELECT * FROM resulth', function (error, results_jdresulth, fields) {
				if (error) {
        console.log(error);
    	  }
				if(results_jdresulth[0].team_id==0||results_jdresulth[1].team_id==0||results_jdresulth[2].team_id==0) {
					res.render('index', { page: "jdresulth", user: results_member, no:"1"});
				} else {
					connection.query('SELECT * FROM teams WHERE id=?', [results_jdresulth[0].team_id], function (error, aresults_party, fields) {
						connection.query('SELECT * FROM teams WHERE id=?', [results_jdresulth[1].team_id], function (error, bresults_party, fields) {
							connection.query('SELECT * FROM teams WHERE id=?', [results_jdresulth[2].team_id], function (error, cresults_party, fields) {
								connection.query('SELECT * FROM members WHERE id=?', [aresults_party[0].leader], function (error, aresults_leader, fields) {
									connection.query('SELECT * FROM members WHERE id=?', [bresults_party[0].leader], function (error, bresults_leader, fields) {
										connection.query('SELECT * FROM members WHERE id=?', [cresults_party[0].leader], function (error, cresults_leader, fields) {
											connection.query('SELECT * FROM members WHERE team=?', [aresults_party[0].id], function (error, aresults_teammember, fields) {
												connection.query('SELECT * FROM members WHERE team=?', [bresults_party[0].id], function (error, bresults_teammember, fields) {
													connection.query('SELECT * FROM members WHERE team=?', [cresults_party[0].id], function (error, cresults_teammember, fields) {
														res.render('index', { page: "jdresulth", user: results_member, resultm: results_jdresultm, ateaminfo: aresults_party, bteaminfo: bresults_party, cteaminfo: cresults_party, ateamleader: aresults_leader, bteamleader: bresults_leader, cteamleader: cresults_leader, amembers: aresults_teammember, bmembers: bresults_teammember, cmembers: cresults_teammember, no:"0"});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				}
			});
    });
  } 
});

/* GET /team 에서 조건부 처리로 인한 비활성화
router.get('/teamm', function(req, res, next) {
  if(isEmpty(req.session.userid)) {
    res.statusCode = 302;
    res.setHeader('Location', '/login');
    res.end();
    return;
  } else {
    connection.query('SELECT * FROM members WHERE id=?', [req.session.userid], function (error, results, fields) {
      if (error) {
        console.log(error);
      } 
      res.render('index', { page: "teamm", user: results});
    });
  } 
});

router.get('/teama', function(req, res, next) {
  if(isEmpty(req.session.userid)) {
    res.statusCode = 302;
    res.setHeader('Location', '/login');
    res.end();
    return;
  } else {
    connection.query('SELECT * FROM members WHERE id=?', [req.session.userid], function (error, results, fields) {
      if (error) {
        console.log(error);
      } 
      res.render('index', { page: "team_leader", username: results[0].name});
    });
  } 
});
*/

router.get('/reg', function(req, res, next) {
  //res.render('register');
  res.statusCode = 302;
  res.setHeader('Location', '/');
  res.end();
  return;
});

router.get('/tempreg', function(req, res, next) {
  res.render('register');
});

router.get('/login', function(req, res, next) {
  if(isEmpty(req.session.userid)) {
    res.render('login');
  } else {
    res.statusCode = 302;
    res.setHeader('Location', '/');
    res.end();
    return;
  }
});

module.exports = router;
