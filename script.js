/*Get Test Data*/
function getData(url, callback) {
  let xobj = new XMLHttpRequest();
  xobj.overrideMimeType("application/json");
  xobj.open("GET", url, true);
  xobj.onreadystatechange = function() {
    if (xobj.readyState == 4 && xobj.status == "200") {
      let data = JSON.parse(xobj.responseText);
      callback(data);
    }
  };
  xobj.send();
}

getData("data1.json", function(data) {
  let result = getConsumedEnergy(data);
  //console.log(result);
});

/* Get Consumed Energy*/
function getConsumedEnergy(data) {
  const devices = data.devices; //Devices
  const rates = data.rates; //Rates
  let maxPower = parseInt(data.maxPower); //Max Power
  let checkMaxPower = checkValue(maxPower);
  const result = {}; //Result

  if (!devices) return "Error: Invalid Devices Data"; //Check devices error
  if (!rates) return "Error: Invalid Rates Data"; //Check rates error
  if (checkMaxPower) return "Error: Invalid maxPower Data"; //Check maxPower error

  /* Sort Devices By Time */
  let sortDevices = sortDevicesByTime(devices, maxPower);
  if (typeof sortDevices == "string") return sortDevices; //Check sort devices by time errors

  let sortDevicesPower = sortDevices.any;
  let sortDevicesPowerDay = sortDevices.day;
  let sortDevicesPowerNight = sortDevices.night;
  maxPower = sortDevices.maxPower;

  if (maxPower <= 0) return "Error: Invalid Power 24-hours-a-day Device"; //Check error

  /* Sort Rates By Time */
  sortRatesByTime(devices, rates, maxPower);

  /* console.log(sortDevicesPower);
  console.log(sortDevicesPowerDay);
  console.log(sortDevicesPowerNight);
  console.log(maxPower); */
}

/* Sort Devices By Time/Power & Change maxPower */
function sortDevicesByTime(devices, maxPower) {
  let devicesPowerAny = []; //Any time
  let devicesPowerDay = []; //Day
  let devicesPowerNight = []; //Night

  /* Sort Time*/
  for (let key in devices) {
    let power = parseInt(devices[key].power);
    let duration = parseInt(devices[key].duration);
    let mode = devices[key].mode;
    let checkPower = checkValue(power); //Check power value
    let checkDuration = checkValue(duration); //Check duration value

    if (checkPower || checkDuration || duration > 24)
      return "Error: Invalid Power/Duration Device Value"; //Check device errors

    if (duration == 24) maxPower -= power; //Change max power

    //Check day & duration
    if (mode) {
      if (mode == "day") {
        if (duration < 15)
          devicesPowerDay[devicesPowerDay.length] = devices[key];
        else return "Error: Invalid Device Day Duration";
      }

      if (mode == "night") {
        if (duration < 11)
          devicesPowerNight[devicesPowerNight.length] = devices[key];
        else return "Error: Invalid Device Night Duration";
      }
    } else if (mode === undefined) {
      devicesPowerAny[devicesPowerAny.length] = devices[key];
    }
  }

  /* Sort Power */
  let sortDevicesObj = {}; //Result
  let sortDevicesPower = sortDevicePower(devicesPowerAny);
  let sortDevicesPowerDay = sortDevicePower(devicesPowerDay);
  let sortDevicesPowerNight = sortDevicePower(devicesPowerNight);

  /* Result*/
  sortDevicesObj.any = sortDevicesPower;
  sortDevicesObj.day = sortDevicesPowerDay;
  sortDevicesObj.night = sortDevicesPowerNight;
  sortDevicesObj.maxPower = maxPower;

  return sortDevicesObj;
}

/* Sort Rates By Time */
function sortRatesByTime(devices, rates, maxPower) {
  /* Check rates data value */

  /* Sort Rate By Day And Time Section */
  let sortRatesDay = sortRateTime(rates, "day");
  let sortRatesNight = sortRateTime(rates, "night");

  /* Sort from value */

  console.log(sortRatesDay);
  console.log(sortRatesNight);
}

/* Sort Rate Time */
function sortRateTime(rates, time) {
  let ratesTime = []; //Result

  for (let key in rates) {
    let from = parseInt(rates[key].from); //From value
    let to = parseInt(rates[key].to); //To value
    let value = parseFloat(rates[key].value); //Rate value

    /* Get From/To Value Time Section */
    let rateObj = identifyTimeSection(from, to, time);

    /* Result */
    rateObj.value = value;
    if (rateObj.value && rateObj.from && rateObj.to)
      ratesTime[ratesTime.length] = rateObj;
  }

  return ratesTime;
}

/* Sort Time Day & Identify Time Section */
function identifyTimeSection(from, to, time) {
  let oldTo = to; //Save old value
  let rateFrom; //New from value
  let rateTo; //New to value
  let nextDay = false; //Next day?

  /* Check Next Day */
  if (from > to) {
    to = 23; //End day
    nextDay = true;
  }

  for (let p = from; p <= to; p++) {
    let checkDay = false; //"Day" section
    let checkNight = false; //"Night" section
    let nightAndDay = false; //From "night" to "day" section
    let dayAndNight = false; //From "day" to "night" section

    /* Check Time Section */
    if (p >= 7 && p <= 21 && time == "day") checkDay = true;
    if (((p >= 21 && p < 24) || p <= 7) && time == "night") checkNight = true;
    if (from < 7 && to > 7) nightAndDay = true;
    if (from > 7 && to > 21) dayAndNight = true;

    /* Sort If Day */
    if (checkDay) {
      if (nightAndDay) from = 7;
      if (dayAndNight) to = 21;

      if (rateFrom == undefined) rateFrom = p; //Get from value rate in "Day"

      if (rateFrom != p) {
        if (p == 21 || p == to) rateTo = p; //Get to value rate in "Day"
      }
    }

    /* Sort If Night */
    if (checkNight) {
      if (nightAndDay) to = 7;
      if (dayAndNight) from = 21;

      if (rateFrom == undefined) rateFrom = p; //Get from value rate in "Night"

      if (rateFrom != p) {
        if (p == 21 || p == to) rateTo = p; //Get to value rate in "Night"
      }
    }

    /* If End Day Go To Next Day */
    if (nextDay && p == 23) {
      from = 0;
      p = 0;
      to = oldTo;
    }
  }

  /* Result */
  let objResult = {};
  objResult.from = rateFrom;
  objResult.to = rateTo;
  return objResult;
}

/* Sort Power Descendingly */
function sortDevicePower(obj) {
  return obj.sort(function(a, b) {
    return parseInt(b.power) - parseInt(a.power);
  });
}

/* Check Value */
function checkValue(val) {
  let num = Number(val);
  if (val <= 0 || val == undefined || num !== num) return true;
  else return false;
}
