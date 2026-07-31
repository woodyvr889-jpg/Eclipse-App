// ==========================
// 🌒 ECLIPSE GUIDE LIVE SYSTEM
// ==========================


// ==========================
// 🔊 VOICE SYSTEM
// ==========================

let spokenEvents = {};

function speak(text) {

  if (!("speechSynthesis" in window)) {
    return;
  }

  const msg = new SpeechSynthesisUtterance(text);

  msg.rate = 1;
  msg.pitch = 1;
  msg.volume = 1;

  speechSynthesis.cancel();
  speechSynthesis.speak(msg);
}


function countdownVoice(label) {

  let count = 10;

  function countdown() {

    if (count > 0) {

      speak(`${label} in ${count}`);

      count--;

      setTimeout(countdown, 1000);

    } else {

      speak(`${label} now`);

    }

  }

  countdown();

}



// ==========================
// ⏱ ECLIPSE TIMES (UK BST)
// ==========================

const eclipseStart = new Date(
"2026-08-12T18:13:45+01:00"
);

const eclipseMax = new Date(
"2026-08-12T19:10:17+01:00"
);

const eclipseEnd = new Date(
"2026-08-12T20:03:49+01:00"
);



// ==========================
// ⏱ TIMER SYSTEM
// ==========================

function updateTimers(){

 const now = new Date();


 updateTimer(
 "startTimer",
 eclipseStart - now
 );


 updateTimer(
 "maxTimer",
 eclipseMax - now
 );


 updateTimer(
 "endTimer",
 eclipseEnd - now
 );


 updatePhase(now);


 checkVoiceAlerts(now);

}



function updateTimer(id,diff){

 const element =
 document.getElementById(id);


 if(!element) return;


 if(diff <= 0){

  element.innerText =
  "00:00:00";

  return;

 }


 const hours =
 Math.floor(diff / 1000 / 60 / 60);


 const minutes =
 Math.floor(diff / 1000 / 60)%60;


 const seconds =
 Math.floor(diff / 1000)%60;


 element.innerText =
 `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;

}




// ==========================
// 🌘 PHASE STATUS
// ==========================

function updatePhase(now){

 const phase =
 document.getElementById("eclipsePhase");


 if(!phase) return;


 let text =
 "Waiting for Eclipse...";


 if(now >= eclipseStart &&
 now < eclipseMax){

  text =
  "🌒 Eclipse In Progress";

 }


 else if(now >= eclipseMax &&
 now < eclipseEnd){

  text =
  "🌑 Greatest Eclipse Happening";

 }


 else if(now >= eclipseEnd){

  text =
  "☀️ Eclipse Finished";

 }


 phase.innerText=text;

}



// ==========================
// 🔊 VOICE ALERTS
// ==========================

function checkVoiceAlerts(now){


 const startSeconds =
 Math.floor(
 (eclipseStart-now)/1000
 );


 const maxSeconds =
 Math.floor(
 (eclipseMax-now)/1000
 );



 // Glasses countdown

 if(startSeconds <=10 &&
 startSeconds >0 &&
 !spokenEvents.start){

  spokenEvents.start=true;

  countdownVoice(
  "Put your eclipse glasses on"
  );

 }



 // Greatest eclipse countdown

 if(maxSeconds <=10 &&
 maxSeconds >0 &&
 !spokenEvents.max){

  spokenEvents.max=true;

  countdownVoice(
  "Greatest eclipse"
  );

 }



 // Eclipse started

 if(now >= eclipseStart &&
 !spokenEvents.started){

  spokenEvents.started=true;

  speak(
  "The eclipse has started"
  );

 }



 // Maximum eclipse

 if(now >= eclipseMax &&
 !spokenEvents.maximum){

  spokenEvents.maximum=true;

  speak(
  "Greatest eclipse now"
  );

 }



 // End

 if(now >= eclipseEnd &&
 !spokenEvents.finished){

  spokenEvents.finished=true;

  speak(
  "The eclipse has ended"
  );

 }


}



// ==========================
// 🚀 START APP
// ==========================

setInterval(
updateTimers,
1000
);


updateTimers();
