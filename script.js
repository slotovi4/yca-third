/*Get Test Data*/
/* function getData(url, callback) {
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

getData("data.json", function(data) {
  let result = getConsumedEnergy(data);
  console.log(result);
}); */

/* Get Consumed Energy */
function getConsumedEnergy(data) {
  const devices = data.devices; //Devices
  const rates = data.rates; //Rates
  let maxPower = parseInt(data.maxPower); //Max Power
  let checkMaxPower = checkValue(maxPower);
  let maxPowerArr = []; //Array containing power hours
  let result = {}; //Result
  result.schedule = {};
  result.consumedEnergy = {};
  result.consumedEnergy.value = 0;
  result.consumedEnergy.devices = {};

  if (!devices) throw "Error: Invalid Devices Data"; //Check devices error
  if (!rates) throw "Error: Invalid Rates Data"; //Check rates error
  if (checkMaxPower) throw "Error: Invalid maxPower Data"; //Check maxPower error

  /* Sort Devices By Time */
  let sortDevices = sortDevicesByTime(devices, maxPower, result, maxPowerArr);
  let sortDevicesAny = sortDevices.any;
  let sortDevicesDay = sortDevices.day;
  let sortDevicesNight = sortDevices.night;

  if (sortDevices.maxPower <= 0)
    throw "Error: Invalid Power 24-hours-a-day Device"; //Check error

  /* Sort Rates By Time */
  let sortRates = sortRatesByTime(rates);
  let sortRatesAny = sortRates.any;
  let sortRatesDay = sortRates.day;
  let sortRatesNight = sortRates.night;

  /* Optimize Energy */
  if (sortDevicesDay.length != 0)
    consumedEnergy(sortDevicesDay, sortRatesDay, maxPower, result, maxPowerArr);
  if (sortDevicesNight.length != 0)
    consumedEnergy(
      sortDevicesNight,
      sortRatesNight,
      maxPower,
      result,
      maxPowerArr
    );
  if (sortDevicesAny.length != 0)
    consumedEnergy(sortDevicesAny, sortRatesAny, maxPower, result, maxPowerArr);

  /* Get Consumed Energy Value */
  let consumedDevEnergy = result.consumedEnergy.devices;
  for (let key in consumedDevEnergy) {
    result.consumedEnergy.value += consumedDevEnergy[key];
  }

  return result;
}

/* Optimize Energy */
function consumedEnergy(devices, rates, maxPower, result, maxPowerArr) {
  for (let devKey in devices) {
    let deviceId = devices[devKey].id; //Device id
    let deviceDuration = devices[devKey].duration; //Device duration
    let devicePower = parseInt(devices[devKey].power); //Device power
    let allDayDev = false; //If device duration = 24
    var latestTo = false; //Last "to" value previous rate
    let checkMaxPowerAppend = checkPowerDeviceToAppend(
      devicePower,
      maxPowerArr,
      maxPower
    ); //Check append device power

    if (devicePower > maxPower) throw "Error: Invalid Device Power";
    if (!checkMaxPowerAppend) throw "Error: Unable To Schedule Device Power";
    if (deviceDuration == 24) allDayDev = true;

    do {
      for (let rateKey in rates) {
        let from = rates[rateKey].from; //Rate from
        let to = rates[rateKey].to; //Rate to
        let value = rates[rateKey].value; //Rate value
        let oldTo = to; //Old "to" value
        let nextDay = false; //Next Day
        let nextRate = false; //Next rate
        let optDeviceEnergy = (devicePower * value) / 1000; //Optimized energy

        /* If can go to next rate */
        if (from == latestTo) nextRate = true;
        else if (latestTo == false) nextRate = true;

        if (result.consumedEnergy.devices[deviceId] == undefined)
          result.consumedEnergy.devices[deviceId] = 0; //Check empty value device energy

        /* Check Next Day */
        if (from > to) {
          to = 24; //End day
          nextDay = true;
        }

        for (let p = from; p < to; p++) {
          //If device duration = 24, only calc energy
          if (allDayDev) {
            result.consumedEnergy.devices[deviceId] += optDeviceEnergy;
            deviceDuration--;
          } else {
            if (deviceDuration > 0 && nextRate) {
              //if continuous operation of the device is possible
              if (maxPowerArr[p] == undefined) maxPowerArr[p] = 0; //Check empty value maxpower
              if (result.schedule[p] == undefined) result.schedule[p] = []; //Check empty value device id

              //if the power is not at the limit => entry device
              if (maxPowerArr[p] + devicePower <= maxPower) {
                //If device absent
                if (result.schedule[p].indexOf(deviceId) === -1) {
                  maxPowerArr[p] += devicePower; //Add power in power Array
                  result.schedule[p].push(deviceId); //Add id in schedule result
                  result.consumedEnergy.devices[deviceId] += optDeviceEnergy;
                }

                deviceDuration--; //if the entry was

                //If end rate
                if (p + 1 == to) {
                  var latestTo = to;
                }
              }
            }
          }

          /* If End Day Go To Next Day */
          if (nextDay && p == 23) {
            from = 0;
            p = -1;
            to = oldTo;
          }
        }

        /* If the device has nowhere to place */
        if (
          parseInt(rateKey) + 1 == rates.length &&
          deviceDuration > 0 &&
          nextRate == false
        ) {
          throw "Error: Unable to schedule";
        }
      }
    } while (deviceDuration > 0);
  }
}

/* Sort Devices By Time/Power & Change maxPower */
function sortDevicesByTime(devices, maxPower, result, maxPowerArr) {
  let devicesPowerAny = []; //Any time
  let devicesPowerDay = []; //Day
  let devicesPowerNight = []; //Night

  /* Sort Time*/
  for (let key in devices) {
    let power = parseInt(devices[key].power);
    let duration = parseInt(devices[key].duration);
    let mode = devices[key].mode;
    let id = devices[key].id;
    let checkPower = checkValue(power); //Check power value
    let checkDuration = checkValue(duration); //Check duration value

    if (checkPower || checkDuration || duration > 24)
      throw "Error: Invalid Power/Duration Device Value"; //Check device errors

    //Add this devise in result.schedule
    if (duration == 24) {
      for (let i = 0; i < 24; i++) {
        if (result.schedule[i] == undefined) result.schedule[i] = [];
        if (maxPowerArr[i] == undefined) maxPowerArr[i] = 0;
        result.schedule[i].push(id);
        maxPowerArr[i] += power;
      }
      maxPower -= power; //Change max power
    }

    //Check day & duration
    if (mode) {
      if (mode == "day") {
        if (duration < 15)
          devicesPowerDay[devicesPowerDay.length] = devices[key];
        else throw "Error: Invalid Device Day Duration";
      }

      if (mode == "night") {
        if (duration < 11)
          devicesPowerNight[devicesPowerNight.length] = devices[key];
        else throw "Error: Invalid Device Night Duration";
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

/* Sort Rates By Time/Values */
function sortRatesByTime(rates) {
  /* Check rates error */
  checkRatesDataValues(rates);

  /* Sort Rate By Day And Time Section */
  let sortRatesDay = sortRateTime(rates, "day");
  let sortRatesNight = sortRateTime(rates, "night");

  /* Sort from value */
  let sortRatesValue = sortRateValue(rates);
  let sortRatesValueDay = sortRateValue(sortRatesDay);
  let sortRatesValueNight = sortRateValue(sortRatesNight);

  /* Result */
  let obj = {};
  obj.any = sortRatesValue;
  obj.day = sortRatesValueDay;
  obj.night = sortRatesValueNight;

  return obj;
}

/* Check Rates Data Values */
function checkRatesDataValues(rates) {
  let valuesArr = [];
  for (let key in rates) {
    let from = parseInt(rates[key].from);
    let to = parseInt(rates[key].to);
    let oldTo = to;
    let nextDay = false;

    /* Check Next Day */
    if (from > to) {
      to = 24; //End day
      nextDay = true;
    }

    for (let p = from; p < to; p++) {
      valuesArr[valuesArr.length] = p;

      /* If End Day Go To Next Day */
      if (nextDay && p == 23) {
        from = 0;
        p = 0;
        to = oldTo;
        valuesArr[valuesArr.length] = p;
      }
    }
  }

  /* Sort Array */
  valuesArr.sort(function(a, b) {
    return a - b;
  });

  /*Check Array */
  if (valuesArr.length != 24) throw "Error: Wrong rates time interval";
  if (valuesArr[0] != 0 || valuesArr[23] != 23)
    throw "Error: Wrong rates values";
}

/*Sort Rate Value */
function sortRateValue(obj) {
  return obj.sort(function(a, b) {
    return parseFloat(a.value) - parseFloat(b.value);
  });
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
    }

    /* Sort If Night */
    if (checkNight) {
      if (nightAndDay) to = 7;
      if (dayAndNight) from = 21;
    }

    /* Get from/to Value */
    if (checkDay || checkNight) {
      if (rateFrom == undefined) rateFrom = p; //Get from value rate in "Time"
      if (rateFrom != p && p == to) rateTo = p; //Get to value rate in "Time"
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

/* Check Pover Device For The Possibility Of Adding To maxPowerArr */
function checkPowerDeviceToAppend(devicePower, maxPowerArr, maxPower) {
  for (let i = 0; i < 24; i++) {
    if (maxPowerArr[i] == undefined) maxPowerArr[i] = 0;
    if (maxPowerArr[i] + devicePower <= maxPower) return true;
  }
  return false;
}
