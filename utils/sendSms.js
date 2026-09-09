// require("dotenv").config();
// const axios = require('axios');


// const CONSENT_SMS_TEMPLATE =
//   'Hi {#alp#}, please accept the consent form to receive your Bigg Boss coupon code. Click the link below to complete the process. This link is valid for {#num#} minutes.- Adinn\n{#urg#}';

// const CLAIM_WINDOW_MINUTES = 5;

// // function buildConsentMessage(name, claimLink) {
// //   return CONSENT_SMS_TEMPLATE.replace('{#alp#}', name || 'there')
// //     .replace('{#num#}', String(CLAIM_WINDOW_MINUTES))
// //     .replace('{#urg#}', `<a href="${claimLink}">${claimLink}</a>`);
// // }

// function buildConsentMessage(name, claimLink) {
//   return CONSENT_SMS_TEMPLATE
//     .replace('{#alp#}', name || 'there')
//     .replace('{#num#}', String(CLAIM_WINDOW_MINUTES))
//     .replace('{#urg#}', claimLink);
// }

// /** Sends the "accept your consent form" SMS via Nettyfish once the coin-win
//  * name+phone form is submitted. Best-effort: errors are logged, never thrown,
//  * so a Nettyfish outage never blocks the claim-link registration flow. */
// async function sendConsentSms(phone, name, claimLink) {
//   const apiKey = process.env.NETTYFISH_API_KEY;
//   const senderId = process.env.NETTYFISH_SENDER_ID;
//   const templateId = process.env.NETTYFISH_TEMPLATE_ID_BCM;
//   const baseUrl = process.env.NETTYFISH_BASE_URL;

//   if (!apiKey || !senderId || !templateId || !baseUrl) {
//     console.error('Nettyfish SMS not configured — skipping SMS send');
//     return { ok: false, message: 'Nettyfish SMS not configured' };
//   }

//   const formattedNumber = String(phone).replace(/\D/g, '');
//   const message = buildConsentMessage(name, claimLink);

//   const url =
//     `${baseUrl}?APIKey=${encodeURIComponent(apiKey)}` +
//     `&senderid=${encodeURIComponent(senderId)}` +
//     `&channel=Trans&DCS=0&flashsms=0` +
//     `&number=${encodeURIComponent(formattedNumber)}` +
//     `&dlttemplateid=${encodeURIComponent(templateId)}` +
//     `&text=${encodeURIComponent(message)}` +
//     `&route=17`;

//   try {
//     const res = await axios.get(url);
//     return { ok: true, response: res.data };
//   } catch (err) {
//     console.error('Nettyfish SMS send failed:', err.message);
//     return { ok: false, message: err.message };
//   }
// }

// module.exports = { sendConsentSms };


require("dotenv").config();
const axios=require("axios");
const CONSENT_SMS_TEMPLATE="Hi {#alp#}, please accept the consent form to receive your Bigg Boss coupon code. Click the link below to complete the process. This link is valid for {#num#} minutes.- Adinn\n{#urg#}";
const CLAIM_WINDOW_MINUTES=20;
function buildConsentMessage(name,claimLink){
return CONSENT_SMS_TEMPLATE.replace("{#alp#}",name||"there").replace("{#num#}",String(CLAIM_WINDOW_MINUTES)).replace("{#urg#}",claimLink);
}
function maskPhone(phone){
const value=String(phone||"");
if(value.length<=4)return value;
return `${"*".repeat(value.length-4)}${value.slice(-4)}`;
}
async function sendConsentSms(phone,name,claimLink){
const apiKey=process.env.NETTYFISH_API_KEY;
const senderId=process.env.NETTYFISH_SENDER_ID;
const templateId=process.env.NETTYFISH_TEMPLATE_ID_BCM;
const baseUrl=process.env.NETTYFISH_BASE_URL;
console.log("========== NETTYFISH SMS START ==========");
console.log("[SMS] Phone:",maskPhone(phone));
console.log("[SMS] Name:",name||"there");
console.log("[SMS] Claim Link:",claimLink);
console.log("[SMS] Sender ID:",senderId||"MISSING");
console.log("[SMS] Template ID:",templateId||"MISSING");
console.log("[SMS] Base URL:",baseUrl||"MISSING");
console.log("[SMS] API Key:",apiKey?"CONFIGURED":"MISSING");
if(!apiKey||!senderId||!templateId||!baseUrl){
console.error("[SMS FAILED] Nettyfish configuration missing");
console.log("========== NETTYFISH SMS END ==========");
return{ok:false,message:"Nettyfish SMS not configured"};
}
let formattedNumber=String(phone||"").replace(/\D/g,"");
if(formattedNumber.length===12&&formattedNumber.startsWith("91")){
formattedNumber=formattedNumber.slice(2);
}
if(formattedNumber.length!==10){
console.error("[SMS FAILED] Invalid phone number:",maskPhone(formattedNumber));
console.log("========== NETTYFISH SMS END ==========");
return{ok:false,message:"Invalid phone number"};
}
const message=buildConsentMessage(name,claimLink);
console.log("[SMS] Message:",message);
const params={
APIKey:apiKey,
senderid:senderId,
channel:"Trans",
DCS:"0",
flashsms:"0",
number:formattedNumber,
dlttemplateid:templateId,
text:message,
route:"17"
};
try{
console.log("[SMS] Sending request to Nettyfish...");
const response=await axios.get(baseUrl,{
params,
timeout:15000,
validateStatus:()=>true
});
console.log("[SMS] HTTP Status:",response.status);
console.log("[SMS] Nettyfish Response:",typeof response.data==="object"?JSON.stringify(response.data):response.data);
if(response.status<200||response.status>=300){
console.error("[SMS FAILED] Nettyfish HTTP error");
console.log("========== NETTYFISH SMS END ==========");
return{ok:false,status:response.status,response:response.data,message:`Nettyfish HTTP ${response.status}`};
}
const responseText=typeof response.data==="string"?response.data:JSON.stringify(response.data);
let parsedResponse=response.data;
if(typeof parsedResponse==="string"){
try{parsedResponse=JSON.parse(parsedResponse);}catch{parsedResponse=null;}
}
const errorCode=parsedResponse&&typeof parsedResponse==="object"?String(parsedResponse.ErrorCode??""):null;
// Nettyfish uses ErrorCode "000" to mean success ("Done"), not an error.
// A structured ErrorCode is authoritative when present; only fall back to
// text-sniffing for legacy/plain-text responses that don't return one.
let hasFailure;
if(errorCode!==null&&errorCode!==""){
hasFailure=errorCode!=="000";
}else{
const lowerResponse=responseText.toLowerCase();
hasFailure=lowerResponse.includes("error")||lowerResponse.includes("fail")||lowerResponse.includes("invalid")||lowerResponse.includes("unauthor")||lowerResponse.includes("rejected");
}
if(hasFailure){
console.error("[SMS FAILED] Nettyfish rejected SMS:",responseText);
console.log("========== NETTYFISH SMS END ==========");
return{ok:false,response:response.data,message:responseText};
}
console.log("[SMS SENT] Nettyfish accepted SMS request successfully (ErrorCode:",errorCode??"n/a",")");
console.log("========== NETTYFISH SMS END ==========");
return{ok:true,status:response.status,response:response.data};
}catch(err){
console.error("[SMS FAILED] Request error:",err.message);
if(err.response){
console.error("[SMS FAILED] HTTP Status:",err.response.status);
console.error("[SMS FAILED] Response:",err.response.data);
}
if(err.code){
console.error("[SMS FAILED] Error Code:",err.code);
}
console.log("========== NETTYFISH SMS END ==========");
return{ok:false,message:err.message,response:err.response?.data||null};
}
}
module.exports={sendConsentSms};