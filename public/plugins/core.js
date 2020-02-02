/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-512, as defined
 * in FIPS 180-2
 * Version 2.2 Copyright Anonymous Contributor, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = ""; /* base-64 pad character. "=" for strict RFC compliance   */
var currentID, currentTeamID, currentNoticeID;
/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_sha512(s)    { return rstr2hex(rstr_sha512(str2rstr_utf8(s))); }
function b64_sha512(s)    { return rstr2b64(rstr_sha512(str2rstr_utf8(s))); }
function any_sha512(s, e) { return rstr2any(rstr_sha512(str2rstr_utf8(s)), e);}
function hex_hmac_sha512(k, d)
  { return rstr2hex(rstr_hmac_sha512(str2rstr_utf8(k), str2rstr_utf8(d))); }
function b64_hmac_sha512(k, d)
  { return rstr2b64(rstr_hmac_sha512(str2rstr_utf8(k), str2rstr_utf8(d))); }
function any_hmac_sha512(k, d, e)
  { return rstr2any(rstr_hmac_sha512(str2rstr_utf8(k), str2rstr_utf8(d)), e);}

/*
 * Perform a simple self-test to see if the VM is working
 */
function sha512_vm_test()
{
  return hex_sha512("abc").toLowerCase() ==
    "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a" +
    "2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f";
}

/*
 * Calculate the SHA-512 of a raw string
 */
function rstr_sha512(s)
{
  return binb2rstr(binb_sha512(rstr2binb(s), s.length * 8));
}

/*
 * Calculate the HMAC-SHA-512 of a key and some data (raw strings)
 */
function rstr_hmac_sha512(key, data)
{
  var bkey = rstr2binb(key);
  if(bkey.length > 32) bkey = binb_sha512(bkey, key.length * 8);

  var ipad = Array(32), opad = Array(32);
  for(var i = 0; i < 32; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = binb_sha512(ipad.concat(rstr2binb(data)), 1024 + data.length * 8);
  return binb2rstr(binb_sha512(opad.concat(hash), 1024 + 512));
}

/*
 * Convert a raw string to a hex string
 */
function rstr2hex(input)
{
  try { hexcase } catch(e) { hexcase=0; }
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var output = "";
  var x;
  for(var i = 0; i < input.length; i++)
  {
    x = input.charCodeAt(i);
    output += hex_tab.charAt((x >>> 4) & 0x0F)
           +  hex_tab.charAt( x        & 0x0F);
  }
  return output;
}

/*
 * Convert a raw string to a base-64 string
 */
function rstr2b64(input)
{
  try { b64pad } catch(e) { b64pad=''; }
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var output = "";
  var len = input.length;
  for(var i = 0; i < len; i += 3)
  {
    var triplet = (input.charCodeAt(i) << 16)
                | (i + 1 < len ? input.charCodeAt(i+1) << 8 : 0)
                | (i + 2 < len ? input.charCodeAt(i+2)      : 0);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > input.length * 8) output += b64pad;
      else output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
    }
  }
  return output;
}

/*
 * Convert a raw string to an arbitrary string encoding
 */
function rstr2any(input, encoding)
{
  var divisor = encoding.length;
  var i, j, q, x, quotient;

  /* Convert to an array of 16-bit big-endian values, forming the dividend */
  var dividend = Array(Math.ceil(input.length / 2));
  for(i = 0; i < dividend.length; i++)
  {
    dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
  }

  /*
   * Repeatedly perform a long division. The binary array forms the dividend,
   * the length of the encoding is the divisor. Once computed, the quotient
   * forms the dividend for the next step. All remainders are stored for later
   * use.
   */
  var full_length = Math.ceil(input.length * 8 /
                                    (Math.log(encoding.length) / Math.log(2)));
  var remainders = Array(full_length);
  for(j = 0; j < full_length; j++)
  {
    quotient = Array();
    x = 0;
    for(i = 0; i < dividend.length; i++)
    {
      x = (x << 16) + dividend[i];
      q = Math.floor(x / divisor);
      x -= q * divisor;
      if(quotient.length > 0 || q > 0)
        quotient[quotient.length] = q;
    }
    remainders[j] = x;
    dividend = quotient;
  }

  /* Convert the remainders to the output string */
  var output = "";
  for(i = remainders.length - 1; i >= 0; i--)
    output += encoding.charAt(remainders[i]);

  return output;
}

/*
 * Encode a string as utf-8.
 * For efficiency, this assumes the input is valid utf-16.
 */
function str2rstr_utf8(input)
{
  var output = "";
  var i = -1;
  var x, y;

  while(++i < input.length)
  {
    /* Decode utf-16 surrogate pairs */
    x = input.charCodeAt(i);
    y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
    if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF)
    {
      x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
      i++;
    }

    /* Encode output as utf-8 */
    if(x <= 0x7F)
      output += String.fromCharCode(x);
    else if(x <= 0x7FF)
      output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0xFFFF)
      output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0x1FFFFF)
      output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                                    0x80 | ((x >>> 12) & 0x3F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
  }
  return output;
}

/*
 * Encode a string as utf-16
 */
function str2rstr_utf16le(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode( input.charCodeAt(i)        & 0xFF,
                                  (input.charCodeAt(i) >>> 8) & 0xFF);
  return output;
}

function str2rstr_utf16be(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
                                   input.charCodeAt(i)        & 0xFF);
  return output;
}

/*
 * Convert a raw string to an array of big-endian words
 * Characters >255 have their high-byte silently ignored.
 */
function rstr2binb(input)
{
  var output = Array(input.length >> 2);
  for(var i = 0; i < output.length; i++)
    output[i] = 0;
  for(var i = 0; i < input.length * 8; i += 8)
    output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (24 - i % 32);
  return output;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2rstr(input)
{
  var output = "";
  for(var i = 0; i < input.length * 32; i += 8)
    output += String.fromCharCode((input[i>>5] >>> (24 - i % 32)) & 0xFF);
  return output;
}

/*
 * Calculate the SHA-512 of an array of big-endian dwords, and a bit length
 */
var sha512_k;
function binb_sha512(x, len)
{
  if(sha512_k == undefined)
  {
    //SHA512 constants
    sha512_k = new Array(
new int64(0x428a2f98, -685199838), new int64(0x71374491, 0x23ef65cd),
new int64(-1245643825, -330482897), new int64(-373957723, -2121671748),
new int64(0x3956c25b, -213338824), new int64(0x59f111f1, -1241133031),
new int64(-1841331548, -1357295717), new int64(-1424204075, -630357736),
new int64(-670586216, -1560083902), new int64(0x12835b01, 0x45706fbe),
new int64(0x243185be, 0x4ee4b28c), new int64(0x550c7dc3, -704662302),
new int64(0x72be5d74, -226784913), new int64(-2132889090, 0x3b1696b1),
new int64(-1680079193, 0x25c71235), new int64(-1046744716, -815192428),
new int64(-459576895, -1628353838), new int64(-272742522, 0x384f25e3),
new int64(0xfc19dc6, -1953704523), new int64(0x240ca1cc, 0x77ac9c65),
new int64(0x2de92c6f, 0x592b0275), new int64(0x4a7484aa, 0x6ea6e483),
new int64(0x5cb0a9dc, -1119749164), new int64(0x76f988da, -2096016459),
new int64(-1740746414, -295247957), new int64(-1473132947, 0x2db43210),
new int64(-1341970488, -1728372417), new int64(-1084653625, -1091629340),
new int64(-958395405, 0x3da88fc2), new int64(-710438585, -1828018395),
new int64(0x6ca6351, -536640913), new int64(0x14292967, 0xa0e6e70),
new int64(0x27b70a85, 0x46d22ffc), new int64(0x2e1b2138, 0x5c26c926),
new int64(0x4d2c6dfc, 0x5ac42aed), new int64(0x53380d13, -1651133473),
new int64(0x650a7354, -1951439906), new int64(0x766a0abb, 0x3c77b2a8),
new int64(-2117940946, 0x47edaee6), new int64(-1838011259, 0x1482353b),
new int64(-1564481375, 0x4cf10364), new int64(-1474664885, -1136513023),
new int64(-1035236496, -789014639), new int64(-949202525, 0x654be30),
new int64(-778901479, -688958952), new int64(-694614492, 0x5565a910),
new int64(-200395387, 0x5771202a), new int64(0x106aa070, 0x32bbd1b8),
new int64(0x19a4c116, -1194143544), new int64(0x1e376c08, 0x5141ab53),
new int64(0x2748774c, -544281703), new int64(0x34b0bcb5, -509917016),
new int64(0x391c0cb3, -976659869), new int64(0x4ed8aa4a, -482243893),
new int64(0x5b9cca4f, 0x7763e373), new int64(0x682e6ff3, -692930397),
new int64(0x748f82ee, 0x5defb2fc), new int64(0x78a5636f, 0x43172f60),
new int64(-2067236844, -1578062990), new int64(-1933114872, 0x1a6439ec),
new int64(-1866530822, 0x23631e28), new int64(-1538233109, -561857047),
new int64(-1090935817, -1295615723), new int64(-965641998, -479046869),
new int64(-903397682, -366583396), new int64(-779700025, 0x21c0c207),
new int64(-354779690, -840897762), new int64(-176337025, -294727304),
new int64(0x6f067aa, 0x72176fba), new int64(0xa637dc5, -1563912026),
new int64(0x113f9804, -1090974290), new int64(0x1b710b35, 0x131c471b),
new int64(0x28db77f5, 0x23047d84), new int64(0x32caab7b, 0x40c72493),
new int64(0x3c9ebe0a, 0x15c9bebc), new int64(0x431d67c4, -1676669620),
new int64(0x4cc5d4be, -885112138), new int64(0x597f299c, -60457430),
new int64(0x5fcb6fab, 0x3ad6faec), new int64(0x6c44198c, 0x4a475817));
  }

  //Initial hash values
  var H = new Array(
new int64(0x6a09e667, -205731576),
new int64(-1150833019, -2067093701),
new int64(0x3c6ef372, -23791573),
new int64(-1521486534, 0x5f1d36f1),
new int64(0x510e527f, -1377402159),
new int64(-1694144372, 0x2b3e6c1f),
new int64(0x1f83d9ab, -79577749),
new int64(0x5be0cd19, 0x137e2179));

  var T1 = new int64(0, 0),
    T2 = new int64(0, 0),
    a = new int64(0,0),
    b = new int64(0,0),
    c = new int64(0,0),
    d = new int64(0,0),
    e = new int64(0,0),
    f = new int64(0,0),
    g = new int64(0,0),
    h = new int64(0,0),
    //Temporary variables not specified by the document
    s0 = new int64(0, 0),
    s1 = new int64(0, 0),
    Ch = new int64(0, 0),
    Maj = new int64(0, 0),
    r1 = new int64(0, 0),
    r2 = new int64(0, 0),
    r3 = new int64(0, 0);
  var j, i;
  var W = new Array(80);
  for(i=0; i<80; i++)
    W[i] = new int64(0, 0);

  // append padding to the source string. The format is described in the FIPS.
  x[len >> 5] |= 0x80 << (24 - (len & 0x1f));
  x[((len + 128 >> 10)<< 5) + 31] = len;

  for(i = 0; i<x.length; i+=32) //32 dwords is the block size
  {
    int64copy(a, H[0]);
    int64copy(b, H[1]);
    int64copy(c, H[2]);
    int64copy(d, H[3]);
    int64copy(e, H[4]);
    int64copy(f, H[5]);
    int64copy(g, H[6]);
    int64copy(h, H[7]);

    for(j=0; j<16; j++)
    {
        W[j].h = x[i + 2*j];
        W[j].l = x[i + 2*j + 1];
    }

    for(j=16; j<80; j++)
    {
      //sigma1
      int64rrot(r1, W[j-2], 19);
      int64revrrot(r2, W[j-2], 29);
      int64shr(r3, W[j-2], 6);
      s1.l = r1.l ^ r2.l ^ r3.l;
      s1.h = r1.h ^ r2.h ^ r3.h;
      //sigma0
      int64rrot(r1, W[j-15], 1);
      int64rrot(r2, W[j-15], 8);
      int64shr(r3, W[j-15], 7);
      s0.l = r1.l ^ r2.l ^ r3.l;
      s0.h = r1.h ^ r2.h ^ r3.h;

      int64add4(W[j], s1, W[j-7], s0, W[j-16]);
    }

    for(j = 0; j < 80; j++)
    {
      //Ch
      Ch.l = (e.l & f.l) ^ (~e.l & g.l);
      Ch.h = (e.h & f.h) ^ (~e.h & g.h);

      //Sigma1
      int64rrot(r1, e, 14);
      int64rrot(r2, e, 18);
      int64revrrot(r3, e, 9);
      s1.l = r1.l ^ r2.l ^ r3.l;
      s1.h = r1.h ^ r2.h ^ r3.h;

      //Sigma0
      int64rrot(r1, a, 28);
      int64revrrot(r2, a, 2);
      int64revrrot(r3, a, 7);
      s0.l = r1.l ^ r2.l ^ r3.l;
      s0.h = r1.h ^ r2.h ^ r3.h;

      //Maj
      Maj.l = (a.l & b.l) ^ (a.l & c.l) ^ (b.l & c.l);
      Maj.h = (a.h & b.h) ^ (a.h & c.h) ^ (b.h & c.h);

      int64add5(T1, h, s1, Ch, sha512_k[j], W[j]);
      int64add(T2, s0, Maj);

      int64copy(h, g);
      int64copy(g, f);
      int64copy(f, e);
      int64add(e, d, T1);
      int64copy(d, c);
      int64copy(c, b);
      int64copy(b, a);
      int64add(a, T1, T2);
    }
    int64add(H[0], H[0], a);
    int64add(H[1], H[1], b);
    int64add(H[2], H[2], c);
    int64add(H[3], H[3], d);
    int64add(H[4], H[4], e);
    int64add(H[5], H[5], f);
    int64add(H[6], H[6], g);
    int64add(H[7], H[7], h);
  }

  //represent the hash as an array of 32-bit dwords
  var hash = new Array(16);
  for(i=0; i<8; i++)
  {
    hash[2*i] = H[i].h;
    hash[2*i + 1] = H[i].l;
  }
  return hash;
}

//A constructor for 64-bit numbers
function int64(h, l)
{
  this.h = h;
  this.l = l;
  //this.toString = int64toString;
}

//Copies src into dst, assuming both are 64-bit numbers
function int64copy(dst, src)
{
  dst.h = src.h;
  dst.l = src.l;
}

//Right-rotates a 64-bit number by shift
//Won't handle cases of shift>=32
//The function revrrot() is for that
function int64rrot(dst, x, shift)
{
    dst.l = (x.l >>> shift) | (x.h << (32-shift));
    dst.h = (x.h >>> shift) | (x.l << (32-shift));
}

//Reverses the dwords of the source and then rotates right by shift.
//This is equivalent to rotation by 32+shift
function int64revrrot(dst, x, shift)
{
    dst.l = (x.h >>> shift) | (x.l << (32-shift));
    dst.h = (x.l >>> shift) | (x.h << (32-shift));
}

//Bitwise-shifts right a 64-bit number by shift
//Won't handle shift>=32, but it's never needed in SHA512
function int64shr(dst, x, shift)
{
    dst.l = (x.l >>> shift) | (x.h << (32-shift));
    dst.h = (x.h >>> shift);
}

//Adds two 64-bit numbers
//Like the original implementation, does not rely on 32-bit operations
function int64add(dst, x, y)
{
   var w0 = (x.l & 0xffff) + (y.l & 0xffff);
   var w1 = (x.l >>> 16) + (y.l >>> 16) + (w0 >>> 16);
   var w2 = (x.h & 0xffff) + (y.h & 0xffff) + (w1 >>> 16);
   var w3 = (x.h >>> 16) + (y.h >>> 16) + (w2 >>> 16);
   dst.l = (w0 & 0xffff) | (w1 << 16);
   dst.h = (w2 & 0xffff) | (w3 << 16);
}

//Same, except with 4 addends. Works faster than adding them one by one.
function int64add4(dst, a, b, c, d)
{
   var w0 = (a.l & 0xffff) + (b.l & 0xffff) + (c.l & 0xffff) + (d.l & 0xffff);
   var w1 = (a.l >>> 16) + (b.l >>> 16) + (c.l >>> 16) + (d.l >>> 16) + (w0 >>> 16);
   var w2 = (a.h & 0xffff) + (b.h & 0xffff) + (c.h & 0xffff) + (d.h & 0xffff) + (w1 >>> 16);
   var w3 = (a.h >>> 16) + (b.h >>> 16) + (c.h >>> 16) + (d.h >>> 16) + (w2 >>> 16);
   dst.l = (w0 & 0xffff) | (w1 << 16);
   dst.h = (w2 & 0xffff) | (w3 << 16);
}

//Same, except with 5 addends
function int64add5(dst, a, b, c, d, e)
{
   var w0 = (a.l & 0xffff) + (b.l & 0xffff) + (c.l & 0xffff) + (d.l & 0xffff) + (e.l & 0xffff);
   var w1 = (a.l >>> 16) + (b.l >>> 16) + (c.l >>> 16) + (d.l >>> 16) + (e.l >>> 16) + (w0 >>> 16);
   var w2 = (a.h & 0xffff) + (b.h & 0xffff) + (c.h & 0xffff) + (d.h & 0xffff) + (e.h & 0xffff) + (w1 >>> 16);
   var w3 = (a.h >>> 16) + (b.h >>> 16) + (c.h >>> 16) + (d.h >>> 16) + (e.h >>> 16) + (w2 >>> 16);
   dst.l = (w0 & 0xffff) | (w1 << 16);
   dst.h = (w2 & 0xffff) | (w3 << 16);
}

function getRemainTime(date) {
	var date = new Date('2020-1-13 00:00:00').getTime();
  $.ajax({
    url: '/remain_time',
    type : "POST",
		data: {
			eddate: date
		}
  }).done(function(results) {
    document.getElementById('timer1s').innerHTML = results;
    console.log(results);
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
	var date = new Date('2020-1-18 24:00:00').getTime();
  $.ajax({
    url: '/remain_time',
    type : "POST",
		data: {
			eddate: date
		}
  }).done(function(results) {
    document.getElementById('timer1e').innerHTML = results;
    console.log(results);
  });
	
	var date = new Date('2020-1-20 00:00:00').getTime();
  $.ajax({
    url: '/remain_time',
    type : "POST",
		data: {
			eddate: date
		}
  }).done(function(results) {
    document.getElementById('timer2s').innerHTML = results;
    console.log(results);
  });
	var date = new Date('2020-2-5 24:00:00').getTime();
  $.ajax({
    url: '/remain_time',
    type : "POST",
		data: {
			eddate: date
		}
  }).done(function(results) {
    document.getElementById('timer2e').innerHTML = results;
    console.log(results);
  });
	
	var date = new Date('2020-2-7 24:00:00').getTime();
  $.ajax({
    url: '/remain_time',
    type : "POST",
		data: {
			eddate: date
		}
  }).done(function(results) {
    document.getElementById('timer3').innerHTML = results;
    console.log(results);
  });
	
	var date = new Date('2020-2-8 00:00:00').getTime();
  $.ajax({
    url: '/remain_time',
    type : "POST",
		data: {
			eddate: date
		}
  }).done(function(results) {
    document.getElementById('timer4s').innerHTML = results;
    console.log(results);
  });
	var date = new Date('2020-2-11 24:00:00').getTime();
  $.ajax({
    url: '/remain_time',
    type : "POST",
		data: {
			eddate: date
		}
  }).done(function(results) {
    document.getElementById('timer4e').innerHTML = results;
    console.log(results);
  });
	
	var date = new Date('2020-2-13 24:00:00').getTime();
  $.ajax({
    url: '/remain_time',
    type : "POST",
		data: {
			eddate: date
		}
  }).done(function(results) {
    document.getElementById('timer5').innerHTML = results;
    console.log(results);
  });
}

function addTeam() {
  var name = document.getElementById('name').value;
  var teamid = document.getElementById('teamid').value;
  var teamidRegex = /^[a-z0-9/]+$/;
  if(!teamidRegex.test(teamid)) {
    alert("팀 ID는 영문 소문자와 숫자로만 구성할 수 있습니다.");
    return false;
  }
	if (name==""||teamid=="") {
		alert("빈칸을 모두 채워주세요");
	} else {
		$.ajax({
			url: '/add_team',
			type : "POST",
			data: {
				name:name,
				teamid: teamid
			}
		}).done(function(results) {
      if(results == 'exist') {
        alert("이 팀 ID를 가진 팀이 이미 존재합니다.");
      } else {
        alert("팀이 생성되었습니다.");
      }
			
			window.location.reload();
		}).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
	}
}

function submit() {
  var name = document.getElementById('name').value;
  var about = document.getElementById('about').value;
  var stack = document.getElementById('stack').value;
  var problem = document.getElementById('problem').value;
  var solve = document.getElementById('solve').value;
  var role = document.getElementById('role').value;
  var plan = document.getElementById('plan').value;
  $.ajax({
    url: '/submit_prj',
    type : "POST",
    data: {
      name:name,
      about:about,
      stack:stack,
      problem:problem,
      solve:solve,
      role:role,
      plan:plan
    }
  }).done(function(results) {
    alert("성공적으로 저장되었습니다.");
    window.location.reload();
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
}

function submit_comp() {
  var url = document.getElementById('curl').value;
  var tech = document.getElementById('ctech').value;
  var lang = document.getElementById('cstack').value;
  var plan = document.getElementById('cplan').value;
  var command = document.getElementById('ccommand').value;
  var github = document.getElementById('cgithub').value;
  var about = document.getElementById('cabout').value;

  $.ajax({
    url: '/submit_comp',
    type : "POST",
    data: {
      url:url, 
      tech:tech,
      lang:lang,
      plan:plan,
      command:command,
      github:github,
      about:about
    }
  }).done(function(results) {
    alert("성공적으로 반영되었습니다. ");
    window.location.reload();
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
}

function joinTeam() {
  var teamid = document.getElementById('teamid2').value;
  var teamidRegex = /^[a-z0-9/]+$/;
  if(!teamidRegex.test(teamid)) {
    alert("팀 ID는 영문 소문자와 숫자로만 구성할 수 있습니다.");
    return false;
  }
  
 
  $.ajax({
    url: '/join_team',
    type : "POST",
    data: {
      teamid:teamid
    }
  }).done(function(results) {
    if(results == 'max') {
      alert("팀 정원 초과로 인해 가입하지 못했습니다.");
    } else if (results == 'notfound') {
      alert("해당 팀 ID를 가진 팀을 찾을 수 없습니다.")
    } else {
      alert("성공적으로 가입되었습니다.");
      window.location.reload();
    }
    
    
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
}

function exitTeam(member) {
  $.ajax({
    url: '/exit_team',
    type : "POST",
    data: {
      member: member
    }
  }).done(function(results) {
    if(results == 'auth') {
      alert("권한이 없습니다.");
    } else {
      alert("성공적으로 삭제되었습니다.");
      window.location.reload();
    } 
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
}

function getMember(id) {
  var name = document.getElementById('editModalName');
  var email = document.getElementById('editModalEmail');
  var grade = document.getElementById('editModalGrade');
  var school = document.getElementById('editModalSchool');
  var phone = document.getElementById('editModalPhone');
  var team = document.getElementById('editModalTeam');
  currentID = id;
  $.ajax({
    url: '/member_info',
    type : "POST",
    data: {
      id:id
    }
  }).done(function(results) {
    if(results == 'invaild') {
      alert("비정상 접근이 감지되었습니다.");
    } else {
      name.value = results[0].name;
      email.value = results[0].email;
      $("#editModalGrade").val(results[0].grade).prop("selected", true);
      school.value = results[0].school;
      phone.value = results[0].phone;
      $("#editModalTeam").val(results[0].team).prop("selected", "selected");
      $('.select2bs4').select2({
        theme: 'bootstrap4'
      })
    } 
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
}

function getTeam(id) {
  var team_id= document.getElementById('editTeamModalId');
  var name = document.getElementById('editTeamModalName');
  var leader = document.getElementById('editTeamModalLeader');
  currentTeamID = id;
  $.ajax({
    url: '/team_members',
    type : "POST",
    data: {
      id:id
    }
  }).done(function(results) {
    $('#editTeamModalLeader').empty();
    for(i=0; i<results.length; i++) {
      $('#editTeamModalLeader').append("<option value='" + results[i].id + "'>" + results[i].name + "</option>");
    }
    $.ajax({
      url: '/team_info',
      type : "POST",
      data: {
        id:id
      }
    }).done(function(results) {
      if(results == 'invaild') {
        alert("비정상 접근이 감지되었습니다.");
      } else {
        name.value = results[0].name;
        team_id.value = results[0].team_id;
        $("#editTeamModalLeader").val(results[0].leader).prop("selected", "selected");
        $('.select2bs4').select2({
          theme: 'bootstrap4'
        });
      } 
    }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
    
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
}

function viewTeam(id) {
  var name=document.getElementById('viewTeamModalName');  
  var about=document.getElementById('viewTeamModalAbout');
  var stack=document.getElementById('viewTeamModalStack');
  var problem=document.getElementById('viewTeamModalProblem');
  var solve=document.getElementById('viewTeamModalSolve');
  var role= document.getElementById('viewTeamModalRole');
  var plan= document.getElementById('viewTeamModalPlan');
  
  $.ajax({
    url: '/team_info',
    type : "POST",
    data: {
      id:id
    }
  }).done(function(results) {
    if(results == 'invaild') {
      alert("비정상 접근이 감지되었습니다.");
    } else {
      name.innerHTML = results[0].prj_name;
      about.innerHTML = results[0].prj_about;
      stack.innerHTML = results[0].prj_stack;
      problem.innerHTML = results[0].prj_problem;
      solve.innerHTML = results[0].prj_solve;
      role.innerHTML = results[0].prj_role;
      plan.innerHTML = results[0].prj_plan;
    } 
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
}



function updateMember() {
  var name = document.getElementById('editModalName');
  var email = document.getElementById('editModalEmail');
  var grade = document.getElementById('editModalGrade');
  var school = document.getElementById('editModalSchool');
  var phone = document.getElementById('editModalPhone');
  var team = document.getElementById('editModalTeam');
  
  $.ajax({
    url: '/member_update',
    type : "POST",
    data: {
      id:currentID,
      name: name.value,
      email: email.value,
      grade: grade.value,
      school: school.value,
      phone: phone.value,
      team: team.value
    }
  }).done(function(results) {
    if(results == 'invaild') {
      alert("값이 형식에 일치하지 않습니다.");
    } else {
      $('#editMemberModal').modal('hide');
      window.location.reload();
    } 
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
}

function updateTeam() {
  var teamId = document.getElementById('editTeamModalId');
  var name = document.getElementById('editTeamModalName');
  var leader = document.getElementById('editTeamModalLeader');
  
  $.ajax({
    url: '/team_update',
    type : "POST",
    data: {
      id:currentTeamID,
      team_id: teamId.value,
      name:name.value,
      leader:leader.value
    }
  }).done(function(results) {
    if(results == 'invaild') {
      alert("값이 형식에 일치하지 않습니다.");
    } else {
      $('#editTeamModal').modal('hide');
      window.location.reload();
    } 
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
}

function logout() {
  $.ajax({
    url: '/logout',
    type : "POST"
  }).done(function(results) {
    window.location.reload();
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
}

function deleteAlert() {
  alert("연계 데이터 오류 발생 방지를 위해 삭제 요청은 비활성화 되어있습니다.\n삭제가 필요한 경우 시스템 관리자에게 문의하십시오.")
}

function deleteTeam(id) {
  var input = confirm('삭제하시겠습니까?');
	if(input) {
    $.ajax({
      url: '/team_delete',
      type : "POST",
      data: {
        id:id
      }
    }).done(function(results) {
      alert("정상적으로 삭제되었습니다.");
      window.location.reload();
    }).fail(function(results) {
      alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
    });
  } else {
    return;
  }
  
}

function viewNotice(id) {
  var title=document.getElementById('editNoticeModalTitle');  
  var content=document.getElementById('editNoticeModalContent');
  var date=document.getElementById('editNoticeModalDate');
  currentNoticeID = id;
  $.ajax({
    url: '/notice_info',
    type : "POST",
    data: {
      id:id
    }
  }).done(function(results) {
    if(results == 'invaild') {
      alert("비정상 접근이 감지되었습니다.");
    } else {
      title.value = results[0].title;
      content.value = results[0].content;
      date.value = results[0].date;
    } 
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
}

function updateNotice() {
  var title=document.getElementById('editNoticeModalTitle');  
  var content=document.getElementById('editNoticeModalContent');
  var date=document.getElementById('editNoticeModalDate');
  $.ajax({
    url: '/notice_update',
    type : "POST",
    data: {
      id:currentNoticeID,
      title:title.value,
      content:content.value
    }
  }).done(function(results) {
    if(results == 'fobbiden') {
      alert("비정상 접근이 감지되었습니다.");
    } else {
      window.location.reload();
    } 
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
}

function editMemo(id) {
  var input = prompt('메모를 입력하세요.', '답변 보류');
  $.ajax({
    url: '/support_update',
    type : "POST",
    data: {
      id:id,
      memo:input
    }
  }).done(function(results) {
    if(results == 'fobbiden') {
      alert("비정상 접근이 감지되었습니다.");
    } else {
      window.location.reload();
    } 
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
}

function deleteNotice(id) {
  $.ajax({
    url: '/notice_delete',
    type : "POST",
    data: {
      id:id
    }
  }).done(function(results) {
    alert("정상적으로 삭제되었습니다.");
    window.location.reload();
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
}

function addNotice() {
  var title=document.getElementById('addNoticeModalTitle');  
  var content=document.getElementById('addNoticeModalContent');
  var date=document.getElementById('addNoticeModalDate');
  $.ajax({
    url: '/notice_add',
    type : "POST",
    data: {
      title:title.value,
      content:content.value
    }
  }).done(function(results) {
    if(results == 'fobbiden') {
      alert("비정상 접근이 감지되었습니다.");
    } else {
      window.location.reload();
    } 
  }).fail(function(results) {
    alert("서버 내부오류가 발생하였습니다. 나중에 다시시도 하시거나,\n'문의하기'를 통해 개발팀에 문의해주시면 최선을 다해 지원하겠습니다.\n불편을 드려 대단히 죄송합니다.")
  });
}