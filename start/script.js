"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const resetBtn = document.querySelector(".reset-btn");

let map;
let mapEvent;

//Класс, который генерирует new id
class Workout {
    date = new Date();
    id = Date.now() + "".slice(-10);
    constructor(coords, distance, duration) {
        // координаты, дистанция,
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }
    _setDescription() {
        //prettier-ignore
        const months = [ "January","February","March","April","May","June",
            "July","August","September","October","November","December",
        ];
        this.description = `${this.type[0].toUpperCase()}
        ${this.type.slice(1)} ${
            months[this.date.getMonth()]
        } ${this.date.getDate()}`;
    }
}

//Экземпляр класса тренировки Бег
class Running extends Workout {
    type = "running";
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }
    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

//Экземпляр класса тренировки Велосипед
class Cyrcling extends Workout {
    type = "cycling";
    constructor(coords, distance, duration, elevation) {
        super(coords, distance, duration);
        this.elevation = elevation;
        this.calcSpeed();
        this._setDescription();
    }
    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

const run1 = new Running([-4, 20], 5.2, 24, 170);
const cyrcling = new Cyrcling([-4, 20], 26, 90, 520);

//Класс, в котором находится основной код программы
class App {
    _workouts = [];
    _map;
    _mapEvent;
    constructor() {
        //Запуск логики приложения
        this._getPosition();

        //Получение данных из Local Storage(LS)
        this._getLocalStorage();

        //Обработчик событий, который вызывает метод _newWorkout
        form.addEventListener("submit", this._newWorkout.bind(this));

        //Обработчик событий, который вызывает метод _toogleField
        inputType.addEventListener("change", this._toogleField());

        //Обработчик события, который вызывает метод _moveToPopap
        containerWorkouts.addEventListener(
            "click",
            this._moveToPopap.bind(this)
        );

        //Обработчик события на кнопку, которая обнуляет все маркеры на карте
        resetBtn.addEventListener("click", this.reset);
    }

    //Метода запроса данных о  местоположении пользователя
    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this),
                function () {
                    alert("Вы не предоставили доступ к своей локации!");
                }
            );
        }
    }

    //Метод загрузки карты на страницу, в случае положительного ответа о предоставлении своих координат
    _loadMap(position) {
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        const coords = [latitude, longitude];
        this._map = L.map("map").setView(coords, 13); //документация карт
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this._map); //добавление карты на экран при помощи API ссылки на стороннем ресурсе

        this._map.on("click", this._showForm.bind(this));

        this._workouts.forEach((work) => {
            this._renderWorkMarker(work);
        });
    }

    //Метод который отобразит форму при клике по карте.
    _showForm(mapE) {
        this._mapEvent = mapE;
        form.classList.remove("hidden");
        inputDistance.focus();
    }
    // Метод который переключает типы тренировок.
    // prettier-ignore
    _toogleField() {
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
  }

    //Метод который ставит метку на карте
    _newWorkout(e) {
        e.preventDefault();

        //Создание функции, для проверки на число в формах "Бег" и "Велосипед"

        const validInputs = (...inputs) =>
            inputs.every((inp) => Number.isFinite(inp));

        //Создание функции-проверки на отрицательное число в формах

        const allPositive = (...inputs) =>
            inputs.every((inp) => {
                inp > 0;
                alert("Вы ввели отрицательное число");
            });

        //Получаем данные из формы
        const type = inputType.value; //тип у нас означает выбор между бегом и велосипедом, а значение находится в value
        const distance = +inputDistance.value; // это у нас значение дистанции
        const duration = +inputDuration.value; // + означает конвертацию в Number(это просто сокращение)
        const { lat, lng } = this._mapEvent.latlng;
        let workout;

        //Валидация форм "Бег"
        if (type === "running") {
            const cadence = +inputCadence.value;

            if (
                !validInputs(distance, duration, cadence) //||
                // !allPositive(distance, duration, cadence)
            ) {
                return alert("Необходимо ввести целое, положительное число");
            }
            workout = new Running([lat, lng], distance, duration, cadence);
        }

        //Валидация форм "Велосипед"
        if (type === "cycling") {
            const elevation = +inputElevation.value;

            if (
                !validInputs(distance, duration, elevation) //||
                // !allPositive(distance, duration, elevation)
            ) {
                return alert("Необходимо ввести целое, положительное число");
            }
            workout = new Cyrcling([lat, lng], distance, duration, elevation);
        }
        this._workouts.push(workout);
        console.log(this._workouts);

        //Рендер маркера тренировки на карте
        this._renderWorkMarker(workout);

        //Рендер тренировки после отправки формы
        this._renderWorkout(workout);

        //Отчистить поля ввода и спрятать форму
        this._hideForm();

        //Подгрузка локального хранилища
        this._setLocalStorage();
    }

    //Отчистить поля ввода и спрятать форму
    _hideForm() {
        inputDistance.value =
            inputDuration.value =
            inputCadence.value =
            inputElevation.value =
                "";
        form.classList.add("hidden");
    }

    //Получение доступа к LS
    _setLocalStorage() {
        localStorage.setItem("workout", JSON.stringify(this._workouts));
    }

    //Получение данных из LS в виде объекта
    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem("workout"));
        console.log(data);
        if (!data) return;

        this._workouts = data;
    }

    //Удаление данных из LS
    reset() {
        localStorage.removeItem("workout");
        location.reload();
    }

    //Метод, который позволяет ставить нам метку на карту
    _renderWorkMarker(workout) {
        L.marker(workout.coords) // добавление маркера
            .addTo(this._map) // добавление маркера на карту
            .bindPopup(
                // биндим popup
                L.popup({
                    // настройка popap
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: "mark-popup",
                })
            )
            .setPopupContent(
                `${workout.type === "running" ? "🏃‍♂️" : "🚴"} ${
                    workout.description
                }`
            ) //текст при добавлении popap
            .openPopup(); // открытие popap
    }

    //Рендер списка тренировок
    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
                workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">км</span>
          </div>
          <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">мин</span>
        </div>
        `;
        if (workout.type === "running") {
            html += `
            div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">мин/км</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">шаг</span>
          </div>
          </li>
            `;

            if (workout.type === "cycling") {
                html += `
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">км/час</span>
              </div>
              <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevation}</span>
                <span class="workout__unit">м</span>
              </div>
            </li>
                `;
            }
        }
        form.insertAdjacentHTML("afterend", html);
    }
    _moveToPopap(e) {
        const workoutEL = e.target.closest(".workout");
        console.log(workoutEL);
        if (!workoutEL) return;

        const workout = this._workouts.find(
            (work) => work.id === workoutEL.dataset.id
        );
        console.log(workout);
        this._map.setView(workout.coords, 13, {
            animate: true,
            pan: { duration: 1 },
        });
    }
}

//Запуск приложения
const app = new App();
