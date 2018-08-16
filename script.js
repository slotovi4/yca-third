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
  const result = {}; //Result
  let maxPower = data.maxPower; //Max Power

  if (!devices) return "Error: Invalid Devices Data"; //Check errors

  /* Sort Devices By Time */
  let sortDevices = sortDevicesByTime(devices, maxPower);
  let sortDevicesPower = sortDevices.any;
  let sortDevicesPowerDay = sortDevices.day;
  let sortDevicesPowerNight = sortDevices.night;
  maxPower = sortDevices.maxPower;

  if (maxPower <= 0) return "Error: Invalid Power 24-hours-a-day Device"; //Check errors

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
    let power = devices[key].power;
    let duration = devices[key].duration;
    let mode = devices[key].mode;

    if (
      power <= 0 ||
      power == undefined ||
      duration <= 0 ||
      duration == undefined
    )
      return "Error: Invalid Devices Values"; //Check device errors

    if (duration == 24) maxPower -= power; //Change max power

    //Check day
    if (mode) {
      if (mode == "day") devicesPowerDay[devicesPowerDay.length] = devices[key];
      if (mode == "night")
        devicesPowerNight[devicesPowerNight.length] = devices[key];
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
    return b.power - a.power;
  });
}
