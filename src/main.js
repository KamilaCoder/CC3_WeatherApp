import './cssreset.css';
import './style.css';
import moment from 'moment-timezone';
import { ENETUNREACH } from 'constants';
const appId = '0ae6c1ab2f3771bcf82ab2f9738ba430';
const apiKey = 'ZA9KO8TP5SVD';
let units = 'metric'; 
let searchMethod = 'q'; 

// LOADING SCREEN

const loadingScreen = document.getElementById('loading');

loading(true);
document.getElementById('hideHtmlFlash').remove();

// GEOLOCATION

navigator.geolocation.getCurrentPosition(geoSuccess, geoDenied);

// If geolocation accepted
function geoSuccess(position) {
    loading(true)
    let lat = position.coords.latitude;
    let lon = position.coords.longitude;
    fetchByCoordinates(lat, lon);
    hideInital();
}
// If geolocation denied
function geoDenied() {
    console.log('Geolocation denied');
    // is something in the local storage?
    if (localStorage.city) {
        hideInital();
        loading(true);
        fetchByCity(localStorage.city);
    }
    loading(false);
}

// CITY INPUT

const cityInput = document.getElementById('cityInput');
const initialInput = document.getElementById('initialCityinput');
let suggestions;

let city = '';

const data = './data/cities.json';
const cities = [];

// fetch file with names of cities for suggestions
 fetch(data)
     .then(blob => blob.json())
     .then(data => cities.push(...data))

cityInput.addEventListener('submit', getCity);
cityInput.addEventListener('change', displayMatches);
cityInput.addEventListener('keyup', displayMatches);

initialInput.addEventListener('submit', getCity);
initialInput.addEventListener('change', displayMatches);
initialInput.addEventListener('keyup', displayMatches);


// FINDING THE RIGHT DATA FOR THE FORECAST

async function findTimeZone(lng, lat) {
    try {
        let timeZoneResponse = await fetch(`https://api.timezonedb.com/v2.1/get-time-zone?key=${apiKey}&format=json&by=position&lng=${lng}&lat=${lat}`);
        if (!timeZoneResponse.ok) {
            throw new Error();
        }
        let timeZone = await (timeZoneResponse.json());
        let zoneName = timeZone.zoneName;
        console.log(zoneName)
        return zoneName;
    } catch (err) {
        console.log(err.message);
    }
}

function convertTimeZone(forecast, zoneName) {
    forecast.list.map(el => {
        let dateUtc = el.dt * 1000;
        let dateUtcFormatted = moment.utc(dateUtc).format()
        el.dt_txt_adjusted = moment.tz(dateUtcFormatted, zoneName).format()

    })
    findDates(forecast, zoneName);
}

function findDates(forecast, zoneName) {
    // filtering out the wather for today
    // filteredForecast is a new array with weather for tomorrow and the next days
    let now = moment.utc(new Date())
    now = now.format();
    now = moment(now).tz(zoneName).format('ll');
    let filteredForecast = forecast.list.filter(function (el) {
        return moment(el.dt_txt_adjusted).tz(zoneName).format('ll') !== now;
    })
    let day1 = filteredForecast.slice(0, 8);
    let day2 = filteredForecast.slice(8, 16);
    let day3 = filteredForecast.slice(16, 24);
    let day4 = filteredForecast.slice(24, 32);

    let days = [day1, day2, day3, day4];
    days = constructDays(days);
    updateForecast(days);
}

function constructDays(days) {
    let minMax = minMaxTemp(days);
    let maxTemps = minMax[0];
    let minTemps = minMax[1];

    let day1 = new Day(days[0], maxTemps[0], minTemps[0]);
    let day2 = new Day(days[1], maxTemps[1], minTemps[1]);
    let day3 = new Day(days[2], maxTemps[2], minTemps[2]);
    let day4 = new Day(days[3], maxTemps[3], minTemps[3]);

    console.log(day1, day2, day3, day4)
    return [day1, day2, day3, day4];
}

// finding the min and max temperature for each day
function minMaxTemp(days) {
    let maxTemps = [];
    let minTemps = [];
    for (let i = 0; i < 4; i++) {
        let dailyMaxTemp = [];
        let dailyMinTemp = [];
        days[i].forEach(el => {
            dailyMaxTemp.push(el.main.temp_max);
            dailyMinTemp.push(el.main.temp_min);
        })
        maxTemps[i] = Math.max(...dailyMaxTemp);
        minTemps[i] = Math.min(...dailyMinTemp)
    }
    return [maxTemps, minTemps];
}

class Day {
    constructor(day, maxTemp, minTemp) {
        this.date = day[4].dt_txt_adjusted;
        this.icon = day[4].weather[0].icon;
        this.id = day[4].weather[0].id,
        this.main = day[4].weather[0].main;
        this.description = day[4].weather[0].description;
        this.maxTemp = maxTemp;
        this.minTemp = minTemp;
    }
}

class Today {
    constructor(currentWeather, zoneName) {
        this.city = currentWeather.name,
            this.Clouds = currentWeather.clouds.all,
            this.Humidity = currentWeather.main.humidity,
            this.Pressure = currentWeather.main.pressure,
            this.Temp = currentWeather.main.temp,
            this.TempMax = currentWeather.main.temp_max,
            this.TempMin = currentWeather.main.temp_min,
            this.Sunrise = moment(currentWeather.sys.sunrise * 1000).tz(zoneName).format(),
            this.Sunset = moment(currentWeather.sys.sunset * 1000).tz(zoneName).format(),
            this.CityDate = moment(currentWeather.dt * 1000).tz(zoneName).format(),
            this.currDescription = currentWeather.weather[0].description,
            this.Id = currentWeather.weather[0].id,
            this.Main = currentWeather.weather[0].main,
            this.Wind = currentWeather.wind.speed,
            this.Icon = currentWeather.weather[0].icon
    }
}


// FETCHING

async function fetchByCity(query) {
   
    try {
        // read current weather
        let weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?${searchMethod}=${query}&units=${units}&APPID=${appId}`);
        if (!weatherResponse.ok) {
            throw new Error();
        }
        let currentWeather = await (weatherResponse.json());
        let zoneName = await findTimeZone(currentWeather.coord.lon, currentWeather.coord.lat);
        let today = new Today(currentWeather, zoneName);
        console.log(today);
        hideInital();
        updateDOM(currentWeather, zoneName);

        // read forecast
        let forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?${searchMethod}=${query}&units=${units}&APPID=${appId}`);
        if (!forecastResponse.ok) {
            throw new Error();
        }
        let forecast = await forecastResponse.json();
        convertTimeZone(forecast, zoneName);

    } catch(err) {

        console.log(err.message);
        alert("Invalid input. Please try again.");
        cityInput.reset();
        localStorage.clear();
        
        loading(false);

    }

}

async function fetchByCoordinates(lat, lon) {
    
    try {
        // read current weather
        let weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&APPID=${appId}`)
        if (!weatherResponse.ok) {
            throw new Error();
        }
        let currentWeather = await (weatherResponse.json());
        let zoneName = await findTimeZone(currentWeather.coord.lon, currentWeather.coord.lat);
        let today = new Today(currentWeather, zoneName);
        console.log(today);
        updateDOM(currentWeather, zoneName);

        // read forecast
        let forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units}&APPID=${appId}`)
        if (!forecastResponse.ok) {
            throw new Error();
        }
        let forecast = await forecastResponse.json();
        convertTimeZone(forecast, zoneName);

    } catch (err) {
        console.log(err.message);
        alert("Couldn't find your location.");
        loading(false);
        document.getElementById("initial").style.display = "flex";
    }
}



// DISPLAY WEATHER IN THE HTML

function updateDOM(currentWeather, zoneName) {
    cityInput.reset();
    //<-----HEADER----->
    //CITY
     let city__name = document.getElementById("city__name");
     let cityName = currentWeather.name;
     city__name.innerText = ' ' + cityName;

     //DATE
     let header__date = document.getElementById("header__date");
     let headerDate = moment(currentWeather.dt * 1000).tz(zoneName).format('dddd, Do MMMM YYYY, h:mm');
     header__date.innerText = ' ' + headerDate;

    //<-----Weather Today Basic Info----->
    //DESCRIPTION
    let basic__description = document.getElementById("basic__description");
    let basicDescription = currentWeather.weather[0].description;
    basic__description.innerText = ' ' + basicDescription;

    //TEMPERATURE
    let basic__temperature = document.getElementById("basic__temperature");
    let basicTemperature = Math.floor(currentWeather.main.temp);
    basic__temperature.innerText = ' ' + basicTemperature;

    //ICON
    let basic__icon = document.getElementById("basic__icon");
    if (currentWeather.weather[0].icon !== 0){
        basic__icon.src = 'icons/' + currentWeather.weather[0].icon + '.png';
    }   

    //<-----Weather Today Details----->
    //WIND
    let wind__description = document.getElementById("wind__description");
    let windDescription = currentWeather.wind.speed;
    wind__description.innerText = ' ' + windDescription + ' m/s';

    //PRESSURE
    let pressure__description = document.getElementById("pressure__description");
    let pressureDescription = currentWeather.main.pressure;
    pressure__description.innerText = ' ' + pressureDescription + ' hPa';

    //HUMIDITY
    let humidity__description = document.getElementById("humidity__description");
    let humidityDescription = currentWeather.main.humidity;
    humidity__description.innerText = ' ' + humidityDescription + ' %';

    //SUNRISE
    let sunrise__description = document.getElementById("sunrise__description");
    let sunriseDescription = moment(currentWeather.sys.sunrise * 1000).tz(zoneName).format('h:mm');
    sunrise__description.innerText = ' ' + sunriseDescription + ' am';

    //SUNSET
    let sunset__description = document.getElementById("sunset__description");
    let sunsetDescription = moment(currentWeather.sys.sunset * 1000).tz(zoneName).format('h:mm');
    sunset__description.innerText = ' ' + sunsetDescription + ' pm';
}

// <----- Forecast----->
function updateForecast(days) {
    //DATA 1
    let first__data = document.getElementById("first__data");
    let firstData = moment(days[0].date).format('dddd, Do MMMM YYYY');
    first__data.innerText = ' ' + firstData;
    //TEMPERATURA 1
    let first__temperature = document.getElementById("first__temperature");
    let firstTemperature = Math.floor(days[0].maxTemp);
    first__temperature.innerText = ' ' + firstTemperature;
    //IKONA 1
    let first__icon = document.getElementById("first__icon");
    if (days[0].icon !== 0) {
        first__icon.src = 'icons/' + days[0].icon + '.png';
    }

    //DATA 2
    let second__data = document.getElementById("second__data");
    let secondData = moment(days[1].date).format('dddd, Do MMMM YYYY');
    second__data.innerText = ' ' + secondData;
    //TEMPERATURA 2
    let second__temperature = document.getElementById("second__temperature");
    let secondTemperature = Math.floor(days[1].maxTemp);
    second__temperature.innerText = ' ' + secondTemperature;
    //IKONA 2
    let second__icon = document.getElementById("second__icon");
    if (days[1].icon !== 0) {
        second__icon.src = 'icons/' + days[1].icon + '.png';
    }

    //DATA 3
    let third__data = document.getElementById("third__data");
    let thirdData = moment(days[2].date).format('dddd, Do MMMM YYYY');
    third__data.innerText = ' ' + thirdData;
    //TEMPERATURA 3
    let third__temperature = document.getElementById("third__temperature");
    let thirdTemperature = Math.floor(days[2].maxTemp);
    third__temperature.innerText = ' ' + thirdTemperature;
    //IKONA 3
    let third__icon = document.getElementById("third__icon");
    if (days[2].icon !== 0) {
        third__icon.src = 'icons/' + days[2].icon + '.png';
    }

    //DATA 4
    let fourth__data = document.getElementById("fourth__data");
    let fourthData = moment(days[3].date).format('dddd, Do MMMM YYYY');
    fourth__data.innerText = ' ' + fourthData;
    //TEMPERATURA 4
    let fourth__temperature = document.getElementById("fourth__temperature");
    let fourthTemperature = Math.floor(days[3].maxTemp);
    fourth__temperature.innerText = ' ' + fourthTemperature;
    //IKONA 4
    let fourth__icon = document.getElementById("fourth__icon");
    if (days[3].icon !== 0) {
        fourth__icon.src = 'icons/' + days[3].icon + '.png';
    }

    loading(false);

}

// READING DATA FROM THE INPUT BOX

function getCity(e) {
    e.preventDefault();

    //list of special chars that we dont want in our string
    const regex = /(--)|[!$%^&*()_+|~=`{}\[\]:\/;<>?,.@#]/;

    let city = e.target[0].value.toLowerCase().trim();

    if (!city) {
        console.log('FormField is empty');
    } else if (city.match(regex) || city.match(/[0-9]/) && city.match(/[a-z]/)) {
        console.log('Input contains invalid characters')
        city = '';
    }

    if (city) {
        loading(true);
        localStorage.setItem('city', city);
        fetchByCity(city);
    }
    hideMatches();
}

//<----- Input box city suggestions ----->

function findMatches(wordToMatch, cities) {
    const regexToMatch = new RegExp(wordToMatch, 'gi');
    return cities.filter(place => {
        return place.c.match(regexToMatch);
    })
}

function displayMatches() {
    const cityName = this[0].value;

    suggestions = this.childNodes[3];

    if (cityName.length >= 3) {
        const matchArray = findMatches(cityName, cities);
        const html = matchArray.map(place => {
            if (place.c.toLowerCase().search(cityName) === 0) {
                return `<li><span class="name">${place.c}</span></li>`;
            }
        }).filter(item => item).slice(0, 5).join('');

        suggestions.innerHTML = html;

       suggestions.addEventListener('click', chooseCity);
    } else {
        hideMatches();
    }
}

function hideMatches() {
    suggestions.innerHTML = '';
    suggestions.removeEventListener('click', chooseCity);
}

function chooseCity(e, inputBox){
    cityInput.firstElementChild.value = e.target.innerText;
    initialInput.firstElementChild.value = e.target.innerText;
    hideMatches();
}


// toggle input form
function toggleForm() {
    let toggler = document.getElementById('toggle__form');
    let toggleEl = function (el) {
        el.classList.toggle('is__visibleBlock');
    };

    toggler.addEventListener('click', function (event) {
        event.preventDefault();

        let content = document.querySelector(event.target.hash);
        if (!content) return;
        toggleEl(content);

    }, false);
};

//toggle settings for smaller devices
function toggleList() {
    let toggler = document.getElementById('toggle__set');
    
    let checkWidth = function () {
        return window.innerWidth;
    }
    let show = function (el) {
        el.style.display = 'block';
    };
    let hide = function (el) {
        el.style.display = 'none';
    };
    let toggleSet = function (el) {
        if (window.getComputedStyle(el).display === 'block') {
            hide(el);
            return;
        }
        show(el);
    };

    toggler.addEventListener('click', function (event) {
         event.preventDefault();
    
        if(checkWidth() <= 900) {
            let setList = document.getElementById('settingsWrapper');
            toggleSet(setList);
        } else {
            return;
        }
    }, false);
};

function loading(setLoading) {
    (setLoading ? loadingScreen.style.display = 'block' : loadingScreen.style.display = 'none');
}

// hide initial screen
function hideInital() {
    document.getElementById("initial").style.display = "none";
};


toggleForm();
toggleList();
