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

getData("data.json", function(data) {
  let result = getConsumedEnergy(data);
  //console.log(result);
});

/* Get Consumed Energy*/
function getConsumedEnergy(data) {
  const devices = data.devices; //Devices
  const rates = data.rates; //Rates
  let maxPower = parseInt(data.maxPower); //Max Power
  const result = {}; //Result

  if (!devices) return "Error: Invalid Devices Data"; //Check devices error
  if (!rates) return "Error: Invalid Rates Data"; //Check rates error
  if (!maxPower || maxPower <= 0) return "Error: Invalid maxPower Data"; //Check maxPower error

  /* Sort Devices By Time */
  let sortDevices = sortDevicesByTime(devices, maxPower);
  if (typeof sortDevices == "string") return sortDevices; //Check sort devices by time errors

  let sortDevicesPower = sortDevices.any;
  let sortDevicesPowerDay = sortDevices.day;
  let sortDevicesPowerNight = sortDevices.night;
  maxPower = sortDevices.maxPower;

  if (maxPower <= 0) return "Error: Invalid Power 24-hours-a-day Device"; //Check error

  console.log(sortDevicesPower);
  console.log(sortDevicesPowerDay);
  console.log(sortDevicesPowerNight);
  console.log(maxPower);
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
