var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const mysql = require('mysql');
const session = require('express-session');
var index = require('./routes/index');
var users = require('./routes/users');
var expressValidator = require('express-validator');
var dateutil = require('date-utils');
var app = express();
const Discord = require('discord.js');
const client = new Discord.Client();                  
var MySQLStore = require('express-mysql-session');    
var serverTime = new Date();
var nodemailer = require('nodemailer')
var AWS = require('aws-sdk');
AWS.config.loadFromPath(__dirname+'/aws-config.json');
const winston = require('./config/winston')
var winstonDaily = require('winston-daily-rotate-file');
var moment = require('moment');
const fs = require('fs'); 

winston.info("서버를 시작합니다.");

var transporter = nodemailer.createTransport({
    SES: new AWS.SES({
        apiVersion: '2010-12-01'
    })
})

var options = {
  host	: 'localhost',
  port	: 3306,
  user	: 'ID',
  password: 'PASSWORD',
  database: 'DBNAME'	
};

var sessionStore = new MySQLStore(options);  

app.use(session({                                              
  secret:"SECRET",
  resave:false,
  saveUninitialized:true,
  store: sessionStore                                          
}))

function isEmpty(value){
  if ( value == "" || value == null || value == undefined || ( value != null && typeof value == "object" && !Object.keys(value).length ) ){
      return true
  } else return false
};

const connection = mysql.createConnection({
  host	: 'localhost',
  port	: 3306,
  user	: 'ID',
  password: 'PASSWORD',
  multipleStatements: true
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  winston.info("디스코드 서버와 성공적으로 연결되었습니다.");
});

function handleDisconnect() {
  connection.connect(function(err) {            
    if(err) {                            
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); 
    }    
    winston.info("MySQL 서버와 성공적으로 연결되었습니다.");
  });                                                             
  connection.on('error', function(err) {
    winston.info('db error');
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { 
      return handleDisconnect();                      
    } else {                                    
      throw err;                              
    }
  });
}

handleDisconnect();

client.login('DISCORD_API_KEY');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', index);
app.use('/users', users);
const { check, validationResult } = require('express-validator');

const embed = {
  "title": "2020. 1. 6. 12시 55분 경에 봇이 작동하지 않는 서비스 오류가 발생했습니다.",
  "description": "봇을 수정하는 중에 서버가 종료되어 발생한 오류로 보이며 현재는 모두 해결된 상태입니다.\n불편을 드려 대단히 죄송합니다.",
  "timestamp": "2020-01-06T02:35:24.698Z",
  "footer": {
    "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png",
    "text": "Service Failure Notice"
  },
  "author": {
    "name": "DevelUP Student Network 운영팀",
    "url": "https://google.com",
    "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png"
  }
};

app.post('/remain_time', function(req, res){
	var _second = 1000;
	var _minute = _second * 60;
	var _hour = _minute * 60;
	var _day = _hour * 24;
	var stDate = new Date().getTime();
	var edDate = req.body.eddate; // 종료날짜
	var RemainDate = edDate - stDate;
  var days = Math.floor((RemainDate / _day));
  var hours = Math.floor((RemainDate % _day) / _hour);
  var miniutes = Math.floor((RemainDate % _hour) / _minute);
  var seconds = Math.floor((RemainDate % _minute) / _second);
  m = days + "일" + hours + "시간" +  miniutes + "분";
  res.end(m);
});

app.post('/infocheck', function(req, res){
	connection.query('SELECT * FROM members WHERE email=?', [req.body.checkemail], function (error, results_email, fields) {
		connection.query('SELECT * FROM members WHERE phone=?', [req.body.checkphone], function (error, results_phone, fields) {
			if(results_email==""&&results_phone=="") {
				res.end("pass");
        winston.info("서비스 중복 검사 통과 - " + req.body.checkemail + '(checkemail), ' + req.body.checkphone + '(phone)');
			} else {
				res.end("fail");
        winston.info("서비스 중복 검사 탈락 - " + req.body.checkemail + '(checkemail), ' + req.body.checkphone + '(phone)');
			}
		});
	});
});

app.post('/register', [check('email').isEmail(), check('phone').isInt().isLength({ min: 10, max: 11 }), check('grade').isInt(), check('password').isAlphanumeric()], function(req, res){
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() })
  }
 connection.query('SELECT * FROM members WHERE phone=? OR email=?', [req.body.phone, req.body.email], function (error, results, fields) {
    if (error) {
      console.log(error);
    }
   if(isEmpty(results)) {
     var verificationString = Math.random().toString(36).substr(2,11); 
      connection.query('INSERT INTO members (name, email, password, grade, school, phone, verificationstring) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.body.name, req.body.email, req.body.password, req.body.grade, req.body.school, req.body.phone, verificationString], function (error, results, fields) {
        if (error) {
          console.log(error);
        }
        winston.info("회원가입됨. - " + req.body.email + '(email), ' + req.body.name + '(name)');
        transporter.sendMail({
          from: 'hello20thon@goorm.io',
          to: req.body.email,
          subject: '[Hello20thon] 참가 신청 인증 이메일입니다.',
          html: '안녕하세요, 구름의 청소년 개발자 커뮤니티 SemiColon입니다.<br>인증하시려면 아래 링크를 클릭하세요.<br>https://hello20thon.goorm.io/verify?string=' + verificationString + ' <br>수신된 이메일을 Hello20thon에 참가신청/등록하지 않았다면, 이메일 도용/차단을 요청할 수 있습니다.<br>서비스 진행에 필요한 발신전용 이메일로 이메일 수신동의 여부에 상관없이 발송되었으며 기타 문의는 <a href="https://kangcw.typeform.com/to/EaftY8">문의하기</a>를 통해 하실 수 있습니다.'
        }, (err, info) => {
          if (err) {
              error(err);
          }
          winston.info("인증 메일 발송됨 - " + req.body.email + '(email), ' + req.body.name + '(name)');

        });
        res.end();
      });
   } else {
     res.end("exist");
     winston.info("중복된 유저 - " + req.body.email + '(email), ' + req.body.name + '(name)');
   }
  });
});

app.post('/member_update', [check('email').isEmail(), check('phone').isInt().isLength({ min: 10, max: 11 }), check('grade').isInt()], function(req, res){
  if(req.session.isadmin !== true) {
    res.end("auth");
    return;
  }
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() })
  }
  connection.query('UPDATE members SET name=?, email=?, grade=?, school=?, phone=?, team=? WHERE id=?', [req.body.name, req.body.email, req.body.grade, req.body.school, req.body.phone, req.body.team, req.body.id], function (error, results, fields) {
    if (error) {
      console.log(error);
    } 
    winston.info("유저 정보 업데이트됨 - " + req.body.email + '(email), ' + req.body.name + '(name)');
    res.end();
  });
});

app.post('/support_update', function(req, res){
  if(req.session.isadmin !== true) {
    res.end("auth");
    return;
  }
  connection.query('UPDATE support SET memo=? WHERE id=?', [req.body.memo, req.body.id], function (error, results, fields) {
    if (error) {
      console.log(error);
    } 
    res.end();
  });
});

app.get('/verify', function(req, res){
  connection.query('UPDATE members SET verified=1 WHERE verificationString=?', [req.query.string], function (error, results, fields) {
    if (error) {
      console.log(error);
    }
    winston.info("이메일 인증됨 - " + req.query.string + '(string)');
    res.redirect('../');
    res.end();
  });
});


app.post('/member_delete', [check('id').isInt()], function(req, res){
  if(req.session.isadmin !== true) {
    res.end("auth");
    return;
  }
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() })
  }
  /* 멤버 삭제는 SQL 쿼리로..
  connection.query('DELETE FROM members WHERE id=?', [req.body.id], function (error, results, fields) {
    if (error) {
      console.log(error);
    } 
    delete req.session.userid;
    req.session.save(function(){
      res.end();
    });
  });
  */
});

app.post('/team_delete', [check('id').isInt()], function(req, res){
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() })
  }
  connection.query('DELETE FROM teams WHERE id=?', [req.body.id], function (error, results, fields) {
    if (error) {
      console.log(error);
    } 
    connection.query('UPDATE members SET team=NULL WHERE team=?', [req.body.id], function (error, results, fields) {
      if (error) {
        console.log(error);
      } 
      winston.info("팀 삭제 및 유저 정보 업데이트됨 - " + req.body.id + '(team)');
      res.end();
    });
  });
});

client.on('guildMemberAdd', member => {
    client.users.get(member.id+'').send("Welcome to DevelUP Student Community!");
    connection.query('INSERT INTO users VALUES(?, 0)', [member.id], function (error, results, fields) {
      if (error) {
        console.log(error);
      } 
      console.log("Member Added");
    });
});

client.on('message', msg => {
  switch (msg.content.split(' ')[0]){  
    case '/역할지정':
      /*
      msg.delete(1000);
      switch (msg.content.split(' ')[1]) {
        case '프론트':
        case '프론트엔드':
          var role = msg.guild.roles.find(role => role.name === "🖥️ Frontend");
          msg.member.addRole(role);
          msg.reply("🖥️ Frontend 역할이 지정되었습니다!").then(msg => {
            msg.delete(1000);
          })
          
          break;
        case '백':
        case '백엔드':
          var role = msg.guild.roles.find(role => role.name === "⚙️ Backend");
          msg.member.addRole(role);
          msg.reply("⚙️ Backend 역할이 지정되었습니다!").then(msg => {
            msg.delete(1000);
          })
         
          break;
        case '모바일':
          var role = msg.guild.roles.find(role => role.name === "📱  Mobile");
          msg.member.addRole(role);
          msg.reply("📱 Mobile 역할이 지정되었습니다!").then(msg => {
            msg.delete(1000);
          })
       
          break;
        case '관리권한':
          var role = msg.guild.roles.find(role => role.name === "Sudo");
          msg.member.addRole(role);
          msg.reply("📱 Mobile 역할이 지정되었습니다!").then(msg => {
            msg.delete(1000);
          });
         
          break;
      }
      */
      break;
    case '/경험치':
      var usr_xp;
      /*
      connection.query('SELECT * FROM users WHERE id=?', [msg.member.id], function (error, results, fields) {
        if (error) {
          console.log(error);
        } 
        console.log(results);
        msg.reply("님의 경험치는 `" + results[0].xp + "`점입니다.").then(msg => {
 
        });
      });
      */
      break;
    case '/팀':
      switch (msg.content.split(' ')[1]){
        case '연동':
          connection.query('UPDATE members SET discord = ? WHERE email=?', [msg.member.displayName + ' (' + msg.member.user.tag + ')', msg.content.split(' ')[2]], function (error, results, fields) {
            if (error) {
              console.log(error);
            } 
            winston.info("해커톤 사이트 디스코드 연동됨 - " + req.body.email + '(email), ' + msg.member.displayName + '(discord)');
            msg.reply("디스코드와 해커톤 사이트 연동이 완료되었습니다.");
          });
        break;
      }
      break;
    default:
      /*
      connection.query('UPDATE users SET xp = xp + 1 WHERE id=?', [msg.member.id], function (error, results, fields) {
        if (error) {
          console.log(error);
        } 
        
        console.log("XP Added to " + msg.member.id);
      });
      */
      break;
    
  }
});

app.post('/team_update', [check('team_id').isAlphanumeric(), check('leader').isInt()], function(req, res){
  
  const errors = validationResult(req);
  console.log(errors);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() })
  }
  connection.query('UPDATE teams SET name=?, team_id=?, leader=? WHERE id=?', [req.body.name, req.body.team_id, req.body.leader, req.body.id], function (error, results, fields) {
    if (error) {
      console.log(error);
    } 
    winston.info("팀 정보 업데이트됨 - " + req.body.name + '(name), ' + req.body.team_id + '(teamid)' + req.body.leader + '(leader)' + req.body.id + '(team)');
    res.end();
  });
});


app.post('/dologin', [check('email').isEmail(), [check('password').isAlphanumeric()]], function(req, res){
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() })
  }
  connection.query('SELECT * FROM members WHERE email=? AND password=?', [req.body.email, req.body.password], function (error, results, fields) {
    if (error) {
      client.channels.get('663262783646859264').send("Hello20thon 웹사이트에 서버 오류가 발생하였습니다." + error);
        console.log(error);
        res.end(500);
    } else { 
      console.log(req.body.email)
      if(!isEmpty(results)) {
        if(!results[0].verified) {
          res.end("notverified");
          return ;
        }
        console.log("Login Success: (id)" + results[0].id);
        req.session.userid=results[0].id
        if(results[0].isadmin === 1) {
          req.session.isadmin = true;
        } else {
          req.session.isadmin = false;
        }
        winston.info("로그인 성공 - " + req.body.email + '(email), ' + results[0].id + '(user)');
        res.end("success");
      } else{
        winston.info("로그인 실패 (비밀번호 부적격) - " + req.body.email + '(email)');
        res.end("invaildPassword");
      }
    }
  });
});


app.post('/add_team', [check('teamid').isAlphanumeric()],function(req, res){
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.end("invaild");
    return;
  }
  console.log( req.session.userid);
  connection.query('SELECT * FROM teams WHERE team_id=?', [req.body.teamid], function (error, results, fields) {
    if (error) {
      console.log(error);
    }
    if(isEmpty(results)) {
      connection.query('INSERT INTO teams (team_id, name, leader) VALUES (?, ?, ?)', [req.body.teamid, req.body.name, req.session.userid], function (error, results, fields) {
        if (error) {
          console.log(error);
        }
        connection.query('UPDATE members SET team = ? WHERE id=?', [results.insertId, req.session.userid], function (error, results, fields) {
          if (error) {
            console.log(error);
          }
          winston.info("팀 생성됨 - " + req.body.teamid + '(teamid), ' + req.session.userid + '(userid)');
          console.log(results);
          res.end();
        });
      });
    } else {
      res.end("exist");
    }
  });
});

app.post('/join_team', [check('teamid').isAlphanumeric()], function(req, res){
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.end("invaild");
    return;
  }
  console.log(req.session.userid);
  connection.query('SELECT id FROM teams WHERE team_id=?', [req.body.teamid], function (error, results_info, fields) {
    if (error) {
      console.log(error);
    }
    if(isEmpty(results_info)) {
      res.end("notfound");
    } else {
      connection.query('SELECT COUNT(*) as cnt FROM members WHERE team=?', [results_info[0].id], function (error, results, fields) {
        if (error) {
          console.log(error);
        }
        console.log(results[0].cnt);
        if(results[0].cnt < 3) {
          connection.query('UPDATE members SET team = ? WHERE id=?', [results_info[0].id, req.session.userid], function (error, results, fields) {
            if (error) {
              console.log(error);
            }
            console.log(results);
            winston.info("팀 가입됨 - " + req.body.teamid + '(teamid), ' + req.session.userid + '(userid)');
            res.end();
          });
        } else {
          winston.info("팀 가입 실패 (정원초과) - " + req.body.teamid + '(teamid), ' + req.session.userid + '(userid)');
          res.end("max");
        }
      });
    }
    
  });
});

app.post('/exit_team', [check('member').isInt()], function(req, res){
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.end("invaild");
    return;
  }
  console.log(req.session.userid);
  connection.query('SELECT team FROM members WHERE id=?', [req.session.userid], function (error, results_info, fields) {
    if (error) {
      console.log(error);
    }
    connection.query('SELECT leader FROM teams WHERE id=?', [results_info[0].team], function (error, results_auth, fields) {
      if (error) {
        console.log(error);
      }
      if(results_auth[0].leader == req.session.userid) {
        connection.query('UPDATE members SET team = NULL WHERE id=?', [req.body.member], function (error, results, fields) {
          if (error) {
            console.log(error);
          }
          if(results_auth[0].leader == req.body.member) {
            connection.query('UPDATE teams SET leader = NULL WHERE id=?', [results_info[0].team], function (error, results, fields) {
              if (error) {
                console.log(error);
              }
              winston.info("팀 탈퇴됨 (리더) - " + req.body.member + '(member), ' + req.session.userid + '(권한자 userid)');
              res.end();
            });
          } else {
            winston.info("팀 탈퇴됨 - " + req.body.member + '(member), ' + req.session.userid + '(권한자 userid)');
            res.end();
          }
        });
      } else {
        res.end("auth")
      }
    });
  });
  
});
app.post('/submit_prj', function(req, res){
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.end("invaild");
    return;
  }
  connection.query('SELECT team FROM members WHERE id=?', [req.session.userid], function (error, results, fields) {
    if (error) {
      console.log(error);
    }
    connection.query('UPDATE teams SET prj_name=?, prj_about=?, prj_stack=?, prj_problem=?, prj_solve=?, prj_role=?, prj_plan=? WHERE id=?', [req.body.name, req.body.about, req.body.stack, req.body.problem, req.body.solve, req.body.role, req.body.plan, results[0].team], function (error, results, fields) {
      if (error) {
        console.log(error);
      }
      winston.info("프로젝트 계획서 제출됨. (" + req.session.userid + ")");
      res.end();
    });
  });
  
});

app.post('/submit_comp', function(req, res){
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.end("invaild");
    return;
  }
  connection.query('SELECT team FROM members WHERE id=?', [req.session.userid], function (error, results, fields) {
    if (error) {
      console.log(error);
    }
    connection.query('UPDATE teams SET container_url = ?, comp_tech = ?, comp_lang = ?, comp_plan = ?, comp_command = ?, comp_github = ?, comp_about = ? WHERE id=?', [req.body.url, req.body.tech, req.body.lang, req.body.plan, req.body.command, req.body.github, req.body.about, results[0].team], function (error, results, fields) {
      if (error) {
        console.log(error);
      }
      res.end();
    });
  });
});

app.post('/member_info', function(req, res){
  connection.query('SELECT * FROM members WHERE id=?', [req.body.id], function (error, results, fields) {
    if (error) {
      console.log(error);
    }
    res.json(results);
  });
});

app.post('/team_info', function(req, res){
  connection.query('SELECT * FROM teams WHERE id=?', [req.body.id], function (error, results, fields) {
    if (error) {
      console.log(error);
    }
    res.json(results);
  });
});

app.post('/team_members', function(req, res){
  connection.query('SELECT * FROM members WHERE team=?', [req.body.id], function (error, results, fields) {
    if (error) {
      console.log(error);
    }
    res.json(results);
  });
});

app.post('/notice_info', [check('id').isInt()], function(req, res){
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() })
  }
  connection.query('SELECT * FROM notice WHERE id=?', [req.body.id], function (error, results, fields) {
    if (error) {
      console.log(error);
    }
    res.json(results);
  });
});

app.post('/notice_add', function(req, res){
  if(req.session.isadmin !== true) {
    res.end("auth");
    return;
  }
  if(req.session.isadmin !== true) {
    res.end("auth");
    return;
  }
  connection.query('INSERT INTO notice (title, content, date) VALUES (?, ?, ?)', [req.body.title, req.body.content, serverTime.toFormat('YYYY/MM/DD')], function (error, results, fields) {
      if (error) {
        console.log(error);
      } 
      winston.info("공지사항 추가됨 - " + req.body.title + '(title), ' + req.session.userid + '(권한자 userid)');
      console.log("Notice Added");
    });
  res.end();
});

app.post('/notice_update', [check('id').isInt()], function(req, res){
  if(req.session.isadmin !== true) {
    res.end("auth");
    return;
  }
  if(req.session.isadmin !== true) {
    res.end("auth");
    return;
  }
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() })
  }
  connection.query('UPDATE notice SET title=?, content=? WHERE id=?', [req.body.title, req.body.content, req.body.id], function (error, results, fields) {
    if (error) {
      console.log(error);
    } 
    winston.info("공지사항 업데이트됨 - " + req.body.title + '(title), ' + req.session.userid + '(권한자 userid)');
    res.end();
  });
});

app.post('/notice_delete', [check('id').isInt()], function(req, res){
  if(req.session.isadmin !== true) {
    res.end("auth");
    return;
  }
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() })
  }
  connection.query('DELETE FROM notice WHERE id=?', [req.body.id], function (error, results, fields) {
    if (error) {
      console.log(error);
    } 
    winston.info("공지사항 삭제됨 - " + req.body.id + '(id), ' + req.session.userid + '(권한자 userid)');
    res.end();
  });
});


app.post('/logout', function(req, res){
  winston.info("세션 로그아웃 시도 - " + req.session.userid + '(userid)');
  delete req.session.userid;
  delete req.session.isadmin;
  req.session.save(function(){
    winston.info("세션 로그아웃됨");
    res.end();
  });
});

app.use((req, res, next) => {
  res.statusCode = 404;

  res.render('err', {
    layout: false, err:'notfound'
  });
});

// error handler
app.use(function(err, req, res, next) {
  client.channels.get('663568727433805824').send("Hello20thon 웹사이트에 서버 오류가 발생하였습니다." + err);
  
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(process.env.PORT || 3000, () => console.log('Example app listening on port 3000!'));

module.exports = app;
