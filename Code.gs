function doGet(){
  try{
    var html = HtmlService.createTemplateFromFile('index').evaluate().setTitle('Interview Scheduler Version 2').setSandboxMode(HtmlService.SandboxMode.NATIVE);
  }catch(e){
  }
  return html; 
} // doGet function that is required to publish a google web app script


// includes the file as html in the main page
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent(); 
}

// main function that accepts the first form value
function getFormValue(formValue) {
  var interviewer = {};
  var returnValue = {};
  returnValue['formValues'] = {};
  var count = parseInt(formValue.count);
  for(var q = 1; q <= count; q++)
  {
    var k = "mainInterviewer"+q;
    var w = "competencyType"+q;
    var x = "interviewType"+q;
    var z = "shadowingInterviewer"+q;                       //4 columns of the interviewer row need to add one checkbox here //mukul
    interviewer["I"+q] = formValue[k];   
    returnValue['formValues']["I"+q] = {};
    returnValue['formValues']["I"+q]["mainInterviewer"+q] = formValue[k];
    returnValue['formValues']["I"+q]["competencyType"+q] = formValue[w];
    returnValue['formValues']["I"+q]["interviewType"+q] = formValue[x];
    returnValue['formValues']["I"+q]["shadowingInterviewer"+q] = formValue[z];
    
  }
 
  var calendar = {};                                // calendar details per interviewer
  for (var m = 1; m <= count; m++) {
    calendar["I" + m] = CalendarApp.getCalendarById(interviewer["I" + m]);
    if(calendar["I" + m] == null){
     //user may not have access, auto-subscribe them.
     calendar["I" + m]  = CalendarApp.subscribeToCalendar(interviewer["I" + m],{hidden:true,selected:false});
   }
  }
  
  Logger.log(formValue);
  
  var sheet = SpreadsheetApp.getActiveSheet();
  var startDatesTimeArray = formValue.startTime.split(":");                         
  var endDatesTimeArray = formValue.endTime.split(":");                  
  var startDateTime = new Date(formValue.startDate + " " + formValue.startTime);
  var endDateTime = new Date(formValue.endDate + " " + formValue.endTime);
  
  var start = new Date(startDateTime),
      end = new Date(endDateTime),
      currentDate = new Date(start),
      between = [];
  while (currentDate <= end) {
    between.push(Utilities.formatDate(new Date(currentDate), "IST", "yyyy-MM-dd"));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  Logger.log(between);
  
  var freebusyArray = {};
  var date, slot;
  var freebusyAllArray = {};
  var freebusyArrayZeroOffset = {};
  var freebusyArrayThirtyOffset = {};
  var freeBusyCombinationArray = {};
  var startTime = 16,                               //start time of every day  ----8 AM
      endTime = 44;                                 //end time of each day     ----11PM
  
  for (var n = 1; n <= count; n++) {
    freebusyArray["I" + n] = {};
    for (var nd = 0; nd < between.length; nd++) {
      date = between[nd];
      freebusyArray["I" + n][date] = {};
      for (var r = startTime; r < endTime; r++) {
        slot = "slot-" + r;
        freebusyArray["I" + n][date][slot] = true;     // array for all interviewers for all days with all possible slots initially set to true
      }
    }
  }
  
  var freebusyArrayJSON = JSON.stringify(freebusyArray);
  Logger.log(freebusyArray);
  
  var obj_arr = {};
  var diff;
  var event_start_time = {};
  var hour_time_arr = {};
  var offset, total_offset;
  for (var j = 1; j <= count; j++) {
    var events = {};
    var date_fb, event_start_time, time_start;
   // Logger.log(startDateTime);
    events["I" + j] = calendar["I" + j].getEvents(startDateTime, endDateTime);    //all events of each interviewer from start to end time
    obj_arr["I" + j] = {};
    for (var i = 0; i < events["I" + j].length; i++) {
      var details = [[events["I" + j][i].getTitle(), events["I" + j][i].getDescription(), events["I" + j][i].getStartTime(), events["I" + j][i].getEndTime()]];
      var a = details[0][0];
      obj_arr["I" + j]["E" + i] = {};
      obj_arr["I" + j]["E" + i]['name'] = details[0][0];
      diff = details[0][3] - details[0][2];
      diff = diff / (60 * 1000);
     
      obj_arr["I" + j]["E" + i]['start'] = Utilities.formatDate(details[0][2], "IST", "yyyy-MM-dd' 'HH:mm:ss");
      obj_arr["I" + j]["E" + i]['end'] = Utilities.formatDate(details[0][3], "IST", "yyyy-MM-dd' 'HH:mm:ss");
      obj_arr["I" + j]["E" + i]['slot_time'] = diff;
      var row = i + 1;
      event_start_time = Utilities.formatDate(details[0][2], "IST", "HH:mm");
      date_fb = Utilities.formatDate(details[0][2], "IST", "yyyy-MM-dd");
      hour_time_arr = event_start_time.split(":");
      if (hour_time_arr[1] >= 0 && hour_time_arr[1] < 30) {
        offset = parseInt(hour_time_arr[1]);
        total_offset = offset + diff;
        time_start = parseInt(hour_time_arr[0]) * 2;
      } else {
        offset = parseInt(hour_time_arr[1]) - 30;
        total_offset = offset + diff;
        time_start = (parseInt(hour_time_arr[0]) + 0.5) * 2;
      }
      freebusyArray["I" + j][date_fb][slot] = true;
      obj_arr["I" + j]["E" + i]['slot-start'] = time_start;
      while (total_offset > 0) {                                                       
        freebusyArray["I" + j][date_fb]["slot-" + time_start] = false;
        total_offset = total_offset - 30;
        time_start = time_start + 1;
      }
    }
  }
  
  for (var z = 0; z < between.length; z++) {
    date = between[z];
    freebusyAllArray[date] = {};
    for (var r = startTime; r < endTime; r++) {
        slot = "slot-" + r;
        freebusyAllArray[date][slot] = [];
        for (var y = 1; y <= count; y++) {
          if (freebusyArray["I" + y][date][slot]) {
            freebusyAllArray[date][slot].push("I" + y);
          }
        }
      }
  }
  
  for (var t = 0; t < between.length; t++) {
    date = between[t];
    freebusyArrayZeroOffset[date] = {};
    for (var r1 = startTime / 2; r1 < endTime / 2; r1++) {
        slot = "slot-" + r1;
        var slot_chk1 = "slot-" + (r1 * 2);
        var slot_chk2 = "slot-" + (r1 * 2 + 1);
        freebusyArrayZeroOffset[date][slot] = [];
        for (var y1 = 1; y1 <= count; y1++) {
          if (in_array("I" + y1, freebusyAllArray[date][slot_chk1]) && in_array("I" + y1, freebusyAllArray[date][slot_chk2])) {
            freebusyArrayZeroOffset[date][slot].push("I" + y1);
          }
        }
     }
  }
  
  
  Logger.log(freebusyArrayZeroOffset);
  
  
  
  for (var t = 0; t < between.length; t++) {
    date = between[t];
    freebusyArrayThirtyOffset[date] = {};
    for (var r1 = startTime / 2; r1 < endTime / 2; r1++) {
        slot = "slot-" + (r1 + 0.5);
        var slot_chk1 = "slot-" + (r1 * 2 + 1);
        var slot_chk2 = "slot-" + (r1 * 2 + 2);
        freebusyArrayThirtyOffset[date][slot] = [];
        for (var y1 = 1; y1 <= count; y1++) {
          if (r1 == endTime / 2) {
            if (in_array("I" + y1, freebusyAllArray[date][slot_chk1]) && in_array("I" + y1, freebusyAllArray[date][slot_chk2])) {
              freebusyArrayThirtyOffset[date][slot].push("I" + y1);
            }
          } else {
            if (in_array("I" + y1, freebusyAllArray[date][slot_chk1])) {
              freebusyArrayThirtyOffset[date][slot].push("I" + y1);
            }
          }
        }
      } 
  }
  
  var slots = [];
  var slotTime;
  var mytestarray = {};
  for (var z = 0; z < between.length; z++) {
    date = between[z];
    freeBusyCombinationArray[date] = {};
    mytestarray[date] = {};
    if(z==0 && startDatesTimeArray[0] > (startTime/2)){
      mytestarray[date] = {};
      var startDatestimevalue = parseInt(startDatesTimeArray[0],10);
      for (var r = startDatestimevalue ; r < (endTime/2 - count); r++) {
        slotTime = r + "-" + (r + count);
        freeBusyCombinationArray[date][slotTime] = {};
        mytestarray[date][slotTime] = {};       
        for (var y = 0; y < count; y++) {
          slots[y] = freebusyArrayZeroOffset[date]["slot-" + (r + y)];
           mytestarray[date][slotTime][y] =  freebusyArrayZeroOffset[date]["slot-" + (r + y)];
        }
        mytestarray[date][slotTime] = slots;   
        var combinations = getCombinations(slots, 0, []);
        freeBusyCombinationArray[date][slotTime] = combinations;
      }
    }
    else if(z == between.length-1 && endDatesTimeArray[0] <= (end/2)){
       mytestarray[date] = {};
      for (var r = startTime / 2; r < (endDatesTimeArray[0] - count+1); r++) {
        r = parseInt(r);
        slotTime = r + "-" + (r + count);        
        freeBusyCombinationArray[date][slotTime] = {};
        mytestarray[date][slotTime] = {};
        for (var y = 0; y < count; y++) {
          slots[y] = freebusyArrayZeroOffset[date]["slot-" + (r + y)];
           mytestarray[date][slotTime][y] =  freebusyArrayZeroOffset[date]["slot-" + (r + y)];
        }  
        var combinations = getCombinations(slots, 0, []);
        freeBusyCombinationArray[date][slotTime] = combinations;
      }
    }
    else
    {
      mytestarray[date] = {};
      for (var r = startTime / 2; r < (endTime / 2 - count); r++) {
        slotTime = r + "-" + (r + count);
        freeBusyCombinationArray[date][slotTime] = {};
         mytestarray[date][slotTime] = {};
        for (var y = 0; y < count; y++) {
          slots[y] = freebusyArrayZeroOffset[date]["slot-" + (r + y)];
           mytestarray[date][slotTime][y] =  freebusyArrayZeroOffset[date]["slot-" + (r + y)];
        }
        mytestarray[date][slotTime] = slots;
        var combinations = getCombinations(slots, 0, []);
        freeBusyCombinationArray[date][slotTime] = combinations;
      }     
    }  
  }
  returnValue['slotInfo'] = freeBusyCombinationArray;
  var myval = JSON.stringify(freebusyArray);
  var myval3 = JSON.stringify(freebusyAllArray);
  var myval2 = JSON.stringify(obj_arr);
  var myval4 = JSON.stringify(freebusyArrayZeroOffset);  
  var myval5 = JSON.stringify(returnValue);
  return myval5;
}

// Recursive algorithm to find the all possible combination of the interviewers like the nurse scheduling algorithm or slaes man algorithm
function getCombinations(slots, index, combination) {
  var slot = slots[index];
  var combinations = [];
  for (var i = 0; i < slot.length; i++) {
    var interviewer = slot[i];
    if (combination.indexOf(interviewer) === -1) {
      var newCombination = cloneArray(combination);
      newCombination.push(interviewer);
      if (index < slots.length - 1) {
        combinations = combinations.concat(getCombinations(slots, index + 1, newCombination));
      } else {
        combinations.push(newCombination);
      }
    }
  }
  return combinations;
}

//Only for single dimentional array
function cloneArray(arr) {
  var newArray = [];
  for (var i = 0; i < arr.length; i++) {
    newArray[i] = arr[i];
  }
  return newArray;
}

//search the value of an element in a single dimensional array
function in_array(needle, haystack) {
  for(var i in haystack) {
    if(haystack[i] == needle) return true;
  }
  return false;
}

function createEvent(secondFormValue){
  var secondarray = {};
  var calendarBookInfoVal  = [];
  calendarBookInfoVal = secondFormValue.calendarBookInfo.split("_");
  var bookDate = calendarBookInfoVal[0];
  var bookSlot = calendarBookInfoVal[1];
  var bookSlotArr = [];
  bookSlotArr = bookSlot.split("-");
  var bookCombination = calendarBookInfoVal[2];
  var bookCombinationArr = [];
  bookCombinationArr = bookCombination.split(",");
  var count = bookCombinationArr.length - 1;
  bookCombinationArr.length = count;
  var calendar = CalendarApp.getDefaultCalendar();
  Session.getActiveUser().getEmail(); 
  var guestList;
  var fixedGuestList = secondFormValue.cordinator+','+secondFormValue.recruiter; 
  var startTimeInt = parseInt(bookSlotArr[0]);
  var eventId = {};
  for(var key in bookCombinationArr)
  {
    var no = bookCombinationArr[key].substring(1);
    guestList = "";
    guestList += fixedGuestList+',';
    var k = "shadowingInterviewer_"+no;
    guestList += secondFormValue[k]+',';
    var n = "mainInterviewer_"+no;
    guestList += secondFormValue[n]+','; 
    var startTime = startTimeInt.toString();
    var startDateTime = convertToDate(bookDate,startTime,0);
    var endDateTime =  convertToDate(bookDate, startTime,1);
    startTimeInt++;
    var m = "competencyType_"+no;
    var p = "interviewType_"+no;
    eventId[no] = calendar.createEvent(secondFormValue.subjectTitle, new Date(startDateTime), new Date(endDateTime), {description: secondFormValue[m]+" "+secondFormValue[p], guests: guestList, sendInvites: true}).addEmailReminder(10);
    
  }
  
  for(var c in secondFormValue)
   {
    // Logger.log(c);
    // Logger.log("data value");
    //Logger.log(secondFormValue[c]);
    secondarray[c] = secondFormValue[c];     
   }
  //Logger.log(secondarray);
  var myval23 = JSON.stringify(secondarray);
  return myval23;  
}

function convertToDate(dateString,timeString,c){
  var dateData = dateString.split("-");
  var hour = Number(timeString);
  var date = new Date(new Date().setFullYear(dateData[0],dateData[1]-1,dateData[2])).setHours(hour,0,0,0);
  var val = 0; 
  if (c == 1){
    val = 60*60*1000;
  }     
  return new Date(date + val);
}