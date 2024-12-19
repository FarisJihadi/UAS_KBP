// Utility functions
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// DOM Elements
const studyInput = $("#study-time");
const breakInput = $("#break-time");
const startButton = $("#start-timer");
const timerDisplay = $("#timer-display");
const newTaskInput = $("#new-task");
const addTaskButton = $("#add-task");
const taskList = $("#task-list");
const motivationalQuote = $("#motivational-quote");
const studyChart = $("#studyChart");

// Spotify Configuration
const SPOTIFY_CLIENT_ID = "c46c4d54baf94a2980199064d86600cd";
// const SPOTIFY_REDIRECT_URI = "http://localhost:5500/Front-End/callback.html"; //kalau mau pake localhost
const SPOTIFY_REDIRECT_URI = "http://127.0.0.1:5500/Front-End/callback.html"; // kalau  pake live server
const SPOTIFY_SCOPES = "user-modify-playback-state user-read-playback-state";

// Check for Spotify access token
const token = localStorage.getItem("spotify_access_token");
if (!token) {
  // console.log("Spotify token not found. Redirect disabled for development.");
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(
    SPOTIFY_REDIRECT_URI
  )}&scope=${encodeURIComponent(SPOTIFY_SCOPES)}`;
  window.location.href = authUrl;
}

// Pomodoro Timer
class PomodoroTimer {
  constructor() {
    this.isRunning = false;
    this.interval = null;
  }

  start(studyTime, breakTime) {
    if (this.isRunning) return;
    this.isRunning = true;
    startButton.textContent = "Running...";
    startButton.disabled = true;

    console.log("Pomodoro Timer Started");
    this.runStudySession(studyTime, breakTime);
  }

  runStudySession(studyTime, breakTime) {
    this.runTimer(studyTime * 60, async () => {
      console.log("Study session finished");
      await pauseSpotify();
      updateStudyTime(studyTime);
      alert("Study time is over. Start your break.");
      this.runBreakSession(breakTime);
    });
  }

  runBreakSession(breakTime) {
    this.runTimer(breakTime * 60, async () => {
      console.log("Break session finished");
      const continueStudy = confirm(
        "Break time is over. Do you want to continue studying?"
      );
      if (continueStudy) {
        await playSpotifyPlaylist();
        this.runStudySession(
          parseInt(studyInput.value),
          parseInt(breakInput.value)
        );
      } else {
        this.reset();
      }
    });
  }

  runTimer(duration, callback) {
    let timeLeft = duration;
    this.updateDisplay(timeLeft);
    this.interval = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        this.updateDisplay(timeLeft);
      } else {
        clearInterval(this.interval);
        callback();
      }
    }, 1000);
  }

  updateDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  reset() {
    this.isRunning = false;
    startButton.textContent = "Start";
    startButton.disabled = false;
    clearInterval(this.interval);
    const studySeconds = (parseInt(studyInput.value) || 0) * 60;
    this.updateDisplay(studySeconds);
  }
}

// Spotify Functions
async function playSpotifyPlaylist() {
  try {
    const response = await fetch("https://api.spotify.com/v1/me/player/play", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context_uri: "spotify:playlist:1x73OMZvZIscAQYAcgMEuv",
      }),
    });
    if (!response.ok) {
      console.error("Spotify Error:", await response.json());
      alert("Failed to play Spotify. Make sure your device is active.");
    }
  } catch (error) {
    console.error("Error Playing Spotify:", error);
  }
}

async function pauseSpotify() {
  try {
    const response = await fetch("https://api.spotify.com/v1/me/player/pause", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      console.error("Error Pausing Spotify:", await response.json());
    } else {
      console.log("Spotify paused.");
    }
  } catch (error) {
    console.error("Error Stopping Spotify:", error);
  }
}

// To-Do List Functions
function addTask() {
  const taskText = newTaskInput.value.trim();
  if (taskText) {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="task-actions">
        <input type="checkbox" class="task-checkbox">
        <span class="task-text">${taskText}</span>
      </div>
      <button class="delete-task">Delete</button>
    `;
    taskList.appendChild(li);
    newTaskInput.value = "";
    saveTasksToLocalStorage();
  }
}

function deleteTask(e) {
  if (e.target.classList.contains("delete-task")) {
    e.target.parentElement.remove();
    saveTasksToLocalStorage();
  }
}

function toggleTaskCompletion(e) {
  if (e.target.classList.contains("task-checkbox")) {
    const taskText = e.target.nextElementSibling;
    if (e.target.checked) {
      taskText.style.textDecoration = "line-through"; // Tambahkan garis coret
    } else {
      taskText.style.textDecoration = "none"; // Hapus garis coret
    }
    saveTasksToLocalStorage();
  }
}

function saveTasksToLocalStorage() {
  const tasks = Array.from(taskList.children).map((li) => ({
    text: li.querySelector(".task-text").textContent,
    completed: li.querySelector(".task-checkbox").checked,
  }));
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function loadTasksFromLocalStorage() {
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="task-actions">
        <input type="checkbox" class="task-checkbox" ${
          task.completed ? "checked" : ""
        }>
        <span class="task-text" style="text-decoration: ${
          task.completed ? "line-through" : "none"
        }">
          ${task.text}
        </span>
      </div>
      <button class="delete-task">Delete</button>
    `;
    taskList.appendChild(li);
  });
}

// Study Statistics
let totalStudyTime = 0;
let totalSessions = 0;
let studyChartInstance = null;

function updateStudyTime(minutes) {
  totalStudyTime += minutes;
  totalSessions += 1;
  localStorage.setItem("totalStudyTime", totalStudyTime);
  localStorage.setItem("totalSessions", totalSessions);
  updateStudyChart();
}

function loadStudyStatistics() {
  totalStudyTime = parseInt(localStorage.getItem("totalStudyTime")) || 0;
  totalSessions = parseInt(localStorage.getItem("totalSessions")) || 0;
  updateStudyChart();
}

function updateStudyChart() {
  const ctx = studyChart.getContext("2d");

  // Destroy previous chart instance if exists
  if (studyChartInstance) {
    studyChartInstance.destroy();
  }

  try {
    studyChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Total Study Time (hours)", "Total Sessions"],
        datasets: [
          {
            label: "Study Statistics",
            data: [Math.round(totalStudyTime / 60), totalSessions],
            backgroundColor: [
              "rgba(75, 192, 192, 0.6)",
              "rgba(9, 65, 140, 0.6)",
            ],
            borderColor: ["rgba(75, 192, 192, 1)", "rgba(9, 65, 140, 1)"],
            borderWidth: 1,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
          },
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  } catch (error) {
    console.error("Error updating the chart:", error);
  }
}

// Motivational Quotes
const quotes = [
  "The only way to do great work is to love what you do. - Steve Jobs",
  "Believe you can and you're halfway there. - Theodore Roosevelt",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
  "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
  "Strive not to be a success, but rather to be of value. - Albert Einstein",
];

function getRandomQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
}

// Event Listeners
const pomodoro = new PomodoroTimer();

startButton.addEventListener("click", () => {
  const studyTime = parseInt(studyInput.value) || 0;
  const breakTime = parseInt(breakInput.value) || 0;
  if (studyTime <= 0 || breakTime <= 0) {
    alert("Please enter valid study and break times.");
    return;
  }
  playSpotifyPlaylist();
  pomodoro.start(studyTime, breakTime);
});

addTaskButton.addEventListener("click", addTask);
taskList.addEventListener("click", (e) => {
  deleteTask(e);
  toggleTaskCompletion(e);
});
newTaskInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addTask();
});

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadTasksFromLocalStorage();
  loadStudyStatistics();
  pomodoro.updateDisplay(parseInt(studyInput.value) * 60 || 0);
  motivationalQuote.textContent = getRandomQuote();
});

async function fetchTechNews() {
  const rssToJsonApi = "https://api.rss2json.com/v1/api.json?rss_url=";
  const techNewsRSS = "https://www.theverge.com/rss/index.xml"; // RSS Feed dari The Verge

  try {
    const response = await fetch(
      rssToJsonApi + encodeURIComponent(techNewsRSS)
    );
    const data = await response.json();

    if (data.status === "ok") {
      displayTechNews(randomizeArticles(data.items));
    } else {
      console.error("Failed to fetch news:", data.message);
    }
  } catch (error) {
    console.error("Error fetching Tech News:", error);
  }
}

// Fungsi untuk random 5 artikel
function randomizeArticles(articles) {
  const shuffled = articles.sort(() => 0.5 - Math.random()); // Acak array artikel
  return shuffled.slice(0, 5); // Ambil 5 artikel acak
}

function displayTechNews(articles) {
  const newsList = document.getElementById("news-list");
  newsList.innerHTML = ""; // Bersihin konten lama

  articles.forEach((article) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <a href="${
        article.link
      }" target="_blank" style="text-decoration: none; color: inherit;">
        <strong>${article.title}</strong>
        <p style="font-size: 0.8rem; color: gray;">${new Date(
          article.pubDate
        ).toDateString()}</p>
      </a>
    `;
    li.style.padding = "0.5rem";
    li.style.margin = "0.5rem 0";
    li.style.background = "#f8f9fa";
    li.style.borderRadius = "5px";
    li.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
    newsList.appendChild(li);
  });
}

fetchTechNews();

document.getElementById("refresh-news").addEventListener("click", () => {
  fetchTechNews();
});

const profileContainer = document.getElementById("profile-container");
const dropdownMenu = document.getElementById("dropdown-menu");
const clearStorageButton = document.getElementById("clear-storage");

// Toggle dropdown saat ikon diklik
profileContainer.addEventListener("click", (e) => {
  e.stopPropagation(); // Mencegah klik keluar langsung menutup dropdown
  dropdownMenu.style.display =
    dropdownMenu.style.display === "block" ? "none" : "block";
});

// Hapus localStorage dan refresh halaman
clearStorageButton.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all data?")) {
    localStorage.clear();
    location.reload();
  }
});

// Tutup dropdown jika klik di luar menu
document.addEventListener("click", (e) => {
  if (!profileContainer.contains(e.target)) {
    dropdownMenu.style.display = "none";
  }
});
