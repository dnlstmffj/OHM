function register() {
	if (document.getElementById('password').value==document.getElementById('passwordre').value) {
		var name = document.getElementById('name').value;
		var email = document.getElementById('email').value;
		var password = document.getElementById('password').value;
		var grade = document.getElementById('grade').value;
		var school = document.getElementById('school').value;
    var phone = document.getElementById('phone').value;
    var emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/g;
    var passwordRegex = /^(?=.*[a-z])(?=.*[0-9])(?=.*[!@~|#\$%\^&\*])(?=.{8,30})/;
    var nameRegex = /^[가-힣]{2,5}$/;
    var schoolRegex = /^[가-힣]{3,20}$/;
    var phoneRegex = /^\d{11}$/;
    var checkbox = document.getElementById('privacy').checked;
    if(!checkbox) {
      alert("개인정보처리방침에 동의하셔야 합니다. 원활한 해커톤 운영을 위한 조치이오니 양해해주시기 바랍니다.");
      return false;
    }
    if(!emailRegex.test(email)) {
      alert("이메일 형식이 올바르지 않습니다.");
      return false;
    }
    if(!phoneRegex.test(phone)) {
      alert("휴대전화번호 형식이 올바르지 않습니다. '-'를 제외하고 입력하세요.");
      return false;
    }
    if(!nameRegex.test(name)) {
      alert("이름은 한글 실명 2~4자만 입력할 수 있습니다.");
      return false;
    }
    if(!schoolRegex.test(school)) {
      alert("정식 학교명을 입력해주세요. (구름중 -> 판교구름중학교)");
      return false;
    }
    if(!passwordRegex.test(password)) {
      alert("비밀번호는 영문, 숫자, 특수문자를 조합하여 8자~30자만 허용됩니다.");
      return false;
    }
    document.getElementById('regBtn').disabled = true;
    var password = hex_sha512(document.getElementById('password').value);
		var fail = 1;
		$.ajax({
			url: '/infocheck',
			type: "POST",
			data: {
				checkemail: email,
				checkphone: phone
			}
		}).done(function(results) {
			var checker=results;
			if (checker=="pass") {
					$.ajax({
					url: '/register',
					type : "POST",
					data : {
						name: name,
						email: email,
						password: password,
						grade: grade,
						school: school,
						phone: phone
					}
				}).done(function(results) {
					window.location.href = '../';
          if(results == 'exist') {
            alert("기존에 가입했던 정보가 있습니다.");
          } else {
            alert("가입이 완료되었습니다.\n이메일 인증후 로그인하실 수 있습니다.");
          }
					
				}).fail(function(results) {
          alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
        });
			} else {
				alert("기존에 가입했던 정보가 있습니다.");
			}
		}).fail(function(request,status,error) {
			alert("code:"+request.status+"\n"+"message:"+request.responseText+"\n"+"error:"+error);
		});  
	} else {
		alert("비밀번호가 일치하지 않습니다.");
	}
}