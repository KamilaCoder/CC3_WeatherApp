const appId = '0ae6c1ab2f3771bcf82ab2f9738ba430';
let units = 'metric'; // jeśli chcemy wyświetlać tez w Fahrenheitach
let searchMethod = 'q';    // jeśli chcemy umozliwić wyszukiwanie po czymś innym niz nazwa miasta

// Geolocation
// Jak ktoś zaakceptuje
function geoSuccess(position) {
   lat = position.coords.latitude;
   lon = position.coords.longitude;
   fetchByCoordinates(lat,lon);
}
// Jak ktoś odmówi - w takim przypadku chyba nic nie robimy i czekamy na input?
function geoDenied() {
    console.log('Geolocation denied');
}
navigator.geolocation.getCurrentPosition(geoSuccess, geoDenied);


const cityInput = document.getElementById('cityInput');
const suggestions = document.querySelector('.suggestions');

let city = '';

const data = './data/cities.json';
const cities = [];

//fetch file with names of cities for suggestions
fetch(data)
    .then(blob => blob.json())
    .then(data => cities.push(...data))

cityInput.addEventListener('submit', getCity);
cityInput.addEventListener('change', displayMatches);
cityInput.addEventListener('keyup', displayMatches);

function fetchByCity(query) {
    // current weather
    let currentWeather = fetch(`http://api.openweathermap.org/data/2.5/weather?${searchMethod}=${query}&units=${units}&APPID=${appId}`)
    .then((response) => {
        if (!response.ok) {
           throw new Error();
        }
        return response.json();
    })
    .then(response => console.log(response.weather[0].description))
    .catch(error => console.log('Not found'))
    // 5-day forecast
    let forecast = fetch(`http://api.openweathermap.org/data/2.5/forecast?${searchMethod}=${query}&units=${units}&APPID=${appId}`)
    .then((response) => {
        if (!response.ok) {
            throw new Error();
        }
        return response.json();
    })
    .then(response => console.log(response))
    .catch(err => console.log('Not found'))
}

function fetchByCoordinates(lat, lon) {
    //current weather
    fetch(`http://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&APPID=${appId}`)
    .then((response) => {
            if (!response.ok) {
                throw new Error();
            }
            return response.json();
        })
        .then(response => console.log(response))
        .catch(err => console.log('Not found'))
    // 5-day forecast
    fetch(`http://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units}&APPID=${appId}`)
        .then((response) => {
            if (!response.ok) {
                throw new Error();
            }
            return response.json();
        })
        .then(response => console.log(response))
        .catch(error => console.log('Not found'))
}

function getCity(e) {
    e.preventDefault();

    //list of special chars that we dont want in our string
    const regex = /(--)|[!$%^&*()_+|~=`{}\[\]:\/;<>?,.@#]/;

    city = e.target[0].value.toLowerCase().trim();

    if (!city) {
        console.log('FormField is empty');
    } else if (city.match(regex) || city.match(/[0-9]/) && city.match(/[a-z]/)) {
        console.log('Input contains invalid characters')
        city = '';
    }

    if(city){
        fetchByCity(city);
    }
}

//zrzynka z wes bosa
function findMatches(wordToMatch, cities) {
    return cities.filter(place => {
        const regexToMatch = new RegExp(wordToMatch, 'gi');
        return place.c.match(regexToMatch);
    })
}

function displayMatches() {
    const cityName = this[0].value;

    if (cityName.length >= 3) {
        const matchArray = findMatches(cityName, cities);
        const html = matchArray.map(place => {
            if (place.c.toLowerCase().search(cityName) === 0) {
                return `<li><span class="name">${place.c}</span></li>`;
            }
        }).join('');

        suggestions.innerHTML = html;
        
    } else {
        suggestions.innerHTML = '';
    }
}