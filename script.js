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
  console.log(result);
});

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
  consumedEnergy(sortDevicesDay, sortRatesDay, maxPower, result, maxPowerArr);
  consumedEnergy(
    sortDevicesNight,
    sortRatesNight,
    maxPower,
    result,
    maxPowerArr
  );
  consumedEnergy(sortDevicesAny, sortRatesAny, maxPower, result, maxPowerArr);

  /* Get Consumed Energy Value */
  let consumedDevEnergy = result.consumedEnergy.devices;
  for (let key in consumedDevEnergy) {
    result.consumedEnergy.value += consumedDevEnergy[key];
  }

  //console.log(sortRatesAny);
  //console.log(sortRatesDay);
  //console.log(sortRatesNight);

  //console.log(sortDevicesAny);
  //console.log(sortDevicesDay);
  //console.log(sortDevicesNight);
  //console.log(maxPower);

  //console.log(result);
  //console.log(maxPowerArr);

  return result;
}

/* Optimize Energy */
function consumedEnergy(devices, rates, maxPower, result, maxPowerArr) {
  for (let devKey in devices) {
    let deviceId = devices[devKey].id; //Device id
    let deviceDuration = devices[devKey].duration; //Device duration
    let devicePower = parseInt(devices[devKey].power); //Device power

    if (deviceDuration == 24) {
      /* Calc energy */
      for (let key in rates) {
        if (result.consumedEnergy.devices[deviceId] == undefined)
          result.consumedEnergy.devices[deviceId] = 0; //Check empty value device energy

        let value = rates[key].value; //Rate value
        let from = rates[key].from; //Rate value
        let to = rates[key].to; //Rate value
        let oldTo = to;
        let nextDay = false;

        /* Check Next Day */
        if (from > to) {
          to = 24; //End day
          nextDay = true;
        }

        for (i = from; i < to; i++) {
          let optDeviceEnergy = (devicePower * value) / 1000; //Optimized energy
          result.consumedEnergy.devices[deviceId] += optDeviceEnergy;

          /* If End Day Go To Next Day */
          if (nextDay && i == 23) {
            from = 0;
            i = -1;
            to = oldTo;
          }
        }
      }
    } else {
      do {
        for (let rateKey in rates) {
          let from = rates[rateKey].from; //Rate from
          let to = rates[rateKey].to; //Rate to
          let value = rates[rateKey].value; //Rate value
          let oldTo = to;
          let nextDay = false;

          let rateTime = to - from;

          /* Check Next Day */
          if (from > to) {
            rateTime = 24 - from + to;
            to = 24; //End day
            nextDay = true;
          }

          let optDeviceEnergy = (devicePower * value) / 1000; //Optimized energy

          for (let p = from; p < to; p++) {
            //if continuous operation of the device is possible
            if (deviceDuration > 0 && rateTime >= deviceDuration) {
              if (maxPowerArr[p] == undefined) maxPowerArr[p] = 0; //Check empty value maxpower
              if (result.schedule[p] == undefined) result.schedule[p] = []; //Check empty value device id
              if (result.consumedEnergy.devices[deviceId] == undefined)
                result.consumedEnergy.devices[deviceId] = 0; //Check empty value device energy

              //if the power is not at the limit => entry device
              if (maxPowerArr[p] + devicePower <= maxPower) {
                //If device absent
                if (result.schedule[p].indexOf(deviceId) === -1) {
                  maxPowerArr[p] += devicePower; //Add power in power Array
                  result.schedule[p].push(deviceId); //Add id in schedule result
                  result.consumedEnergy.devices[deviceId] += optDeviceEnergy;
                }

                deviceDuration--; //if the entry was
              } else rateTime--; //if was no entry
            }

            /* If the device has nowhere to place */
            if (parseInt(rateKey) + 1 == rates.length && deviceDuration > 0) {
              throw "Error: Unable to schedule";
            }

            /* If End Day Go To Next Day */
            if (nextDay && p == 23) {
              from = 0;
              p = -1;
              to = oldTo;
            }
          }
        }
      } while (deviceDuration > 0);
    }
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
