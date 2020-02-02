function login() {
  
  var email = document.getElementById('email').value;
  var emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/g;
  if(!emailRegex.test(email)) {
    alert("올바른 이메일을 입력하세요.");
    return false;
  }
  var password = document.getElementById('password').value;
  var passwordRegex = /^(?=.*[a-z])(?=.*[0-9])(?=.*[!@~|#\$%\^&\*])(?=.{8,30})/;
  if(!passwordRegex.test(password)) {
    alert("비밀번호는 영문, 숫자, 특수문자를 조합하여 8자~30자만 허용됩니다.");
    return false;
  }
  document.getElementById('loginBtn').disabled = true;
  var password_hex = hex_sha512(document.getElementById('password').value);
  $.ajax({
    url: '/dologin',
    type : "POST",
    data : {
      email: email,
      password: password_hex
    }
  }).done(function(results) {
    if(results == "invaildPassword") alert("아이디 또는 비밀번호가 올바르지 않습니다.");
    else if(results == "notverified") alert("이메일 인증이 필요합니다. 가입한 이메일로 전송된 링크를 클릭하세요. \n이메일을 찾을 수 없다면 스팸메일함을 확인해보신후 문제가 지속되면 \n로그인페이지 -> 문의하기 버튼을 통해 지원을 요청해주시기 바랍니다.");
    window.location.href = '../';
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.");
    
  });
}

$('#password').on('keypress', function(e){
  if(e.keyCode == '13'){
    login();
  }
});
