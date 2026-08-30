// ============================================================
// PC CONTROL — ОСНОВНОЙ JAVASCRIPT
// ============================================================


// ============================================================
// API
// ============================================================

async function api(url, options = {}) {

    // Получаем токен авторизации из браузера.
    const token = localStorage.getItem(
        "pc_control_token"
    );

    // Добавляем токен ко всем запросам.
    options.headers = {
        ...(options.headers || {}),
        "X-Auth-Token": token || ""
    };

    const response = await fetch(
        url,
        options
    );

    // Если сервер сообщает, что авторизация закончилась.
    if (response.status === 401) {

        localStorage.removeItem(
            "pc_control_token"
        );

        showLogin();

        throw new Error(
            "Требуется авторизация"
        );
    }

    let data;

    try {

        data = await response.json();

    } catch {

        throw new Error(
            "Сервер вернул некорректный ответ"
        );
    }

    if (!response.ok) {

        throw new Error(
            data.error ||
            "Произошла ошибка"
        );
    }

    return data;
}


// ============================================================
// ЭКРАН ВХОДА
// ============================================================

function showLogin() {

    document
        .getElementById("loginScreen")
        .classList.remove("hidden");

    document
        .getElementById("app")
        .classList.add("hidden");
}


function showApp() {

    document
        .getElementById("loginScreen")
        .classList.add("hidden");

    document
        .getElementById("app")
        .classList.remove("hidden");
}


// ============================================================
// ПРОВЕРКА СОХРАНЁННОЙ АВТОРИЗАЦИИ
// ============================================================

async function checkAuthorization() {

    const token = localStorage.getItem(
        "pc_control_token"
    );

    if (!token) {

        showLogin();

        return false;
    }

    try {

        await api(
            "/api/status"
        );

        showApp();

        return true;

    } catch {

        localStorage.removeItem(
            "pc_control_token"
        );

        showLogin();

        return false;
    }
}


// ============================================================
// ВХОД
// ============================================================

const loginForm =
    document.getElementById(
        "loginForm"
    );

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const password =
                document
                    .getElementById(
                        "password"
                    )
                    .value;

            const errorElement =
                document
                    .getElementById(
                        "loginError"
                    );

            errorElement.textContent = "";

            try {

                const result = await api(
                    "/api/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            password: password
                        })
                    }
                );

                // Сервер должен вернуть token.
                if (!result.token) {

                    throw new Error(
                        "Сервер не вернул токен авторизации"
                    );
                }

                // Сохраняем токен браузера.
                localStorage.setItem(
                    "pc_control_token",
                    result.token
                );

                showApp();

                await refreshAll();

                showToast(
                    "Добро пожаловать!"
                );

                // Очищаем поле пароля.
                document
                    .getElementById(
                        "password"
                    )
                    .value = "";

            } catch (error) {

                errorElement.textContent =
                    error.message;
            }
        }
    );
}


// ============================================================
// ВЫХОД
// ============================================================

const logoutButton =
    document.getElementById(
        "logoutButton"
    );

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function() {

            try {

                await api(
                    "/api/logout",
                    {
                        method: "POST"
                    }
                );

            } catch (error) {

                console.error(
                    error
                );

            } finally {

                localStorage.removeItem(
                    "pc_control_token"
                );

                showLogin();

                document
                    .getElementById(
                        "password"
                    )
                    .value = "";

                showToast(
                    "Вы вышли из панели"
                );
            }
        }
    );
}


// ============================================================
// КНОПКИ УПРАВЛЕНИЯ ПК
// ============================================================

document
    .querySelectorAll(
        "[data-action]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                async function() {

                    const action =
                        this.dataset.action;

                    // Для выключения и перезагрузки
                    // обязательно спрашиваем подтверждение.
                    if (
                        action === "shutdown" ||
                        action === "restart"
                    ) {

                        const message =
                            action === "shutdown"
                                ? "Выключить компьютер через 5 секунд?"
                                : "Перезагрузить компьютер через 5 секунд?";

                        if (
                            !confirm(message)
                        ) {

                            return;
                        }
                    }

                    // Временно блокируем кнопку.
                    this.disabled = true;

                    try {

                        const result =
                            await api(
                                `/api/action/${action}`,
                                {
                                    method: "POST"
                                }
                            );

                        if (result.ok) {

                            showToast(
                                getActionName(
                                    action
                                )
                            );

                            await refreshLog();

                        }

                    } catch (error) {

                        showToast(
                            error.message
                        );

                    } finally {

                        this.disabled = false;
                    }
                }
            );
        }
    );

// ============================================================
// УПРАВЛЕНИЕ ПК
// ============================================================

async function executeAction(action) {

    try {

        const response = await fetch(
            `/api/action/${action}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.error || "Ошибка выполнения команды"
            );

        }

        showToast(
            data.message || "Команда выполнена"
        );

        addLog(
            data.message || `Выполнено: ${action}`
        );

    } catch (error) {

        console.error(error);

        showToast(
            `❌ ${error.message}`,
            true
        );
    }
}


// ============================================================
// КНОПКИ УПРАВЛЕНИЯ
// ============================================================

document
    .querySelectorAll("[data-action]")
    .forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                const action =
                    button.dataset.action;

                if (!action) {
                    return;
                }

                // Подтверждение опасных действий
                if (
                    action === "shutdown" ||
                    action === "restart"
                ) {

                    const confirmed =
                        confirm(
                            action === "shutdown"
                                ? "Выключить компьютер?"
                                : "Перезагрузить компьютер?"
                        );

                    if (!confirmed) {
                        return;
                    }
                }

                // Блокируем кнопку на время выполнения
                button.disabled = true;

                try {

                    await executeAction(action);

                } finally {

                    button.disabled = false;

                }

            }
        );

    });

// ============================================================
// НАЗВАНИЯ КОМАНД
// ============================================================

function getActionName(action) {

    const names = {

        shutdown:
            "🔴 Выключение запущено",

        restart:
            "🔄 Перезагрузка запущена",

        sleep:
            "💤 Компьютер переводится в сон",

        lock:
            "🔒 Компьютер заблокирован",

        cancel:
            "❌ Выключение отменено"
    };

    return (
        names[action] ||
        "Команда выполнена"
    );
}


// ============================================================
// СТАТУС КОМПЬЮТЕРА
// ============================================================

async function refreshStatus() {

    const data =
        await api(
            "/api/status"
        );


    // --------------------------------------------------------
    // ИМЯ КОМПЬЮТЕРА
    // --------------------------------------------------------

    const hostname =
        document.getElementById(
            "hostname"
        );

    if (hostname) {

        hostname.textContent =
            data.hostname ||
            "Неизвестный компьютер";
    }


    // --------------------------------------------------------
    // CPU
    // --------------------------------------------------------

    const cpu =
        Number(
            data.cpu_percent || 0
        );

    const cpuElement =
        document.getElementById(
            "cpu"
        );

    if (cpuElement) {

        cpuElement.textContent =
            `${cpu.toFixed(1)}%`;
    }

    const cpuBar =
        document.getElementById(
            "cpuBar"
        );

    if (cpuBar) {

        cpuBar.style.width =
            `${Math.min(
                100,
                Math.max(
                    0,
                    cpu
                )
            )}%`;
    }


    // --------------------------------------------------------
    // RAM
    // --------------------------------------------------------

    const ram =
        Number(
            data.ram_percent || 0
        );

    const ramElement =
        document.getElementById(
            "ram"
        );

    if (ramElement) {

        ramElement.textContent =
            `${ram.toFixed(1)}%`;
    }

    const ramBar =
        document.getElementById(
            "ramBar"
        );

    if (ramBar) {

        ramBar.style.width =
            `${Math.min(
                100,
                Math.max(
                    0,
                    ram
                )
            )}%`;
    }


    const ramText =
        document.getElementById(
            "ramText"
        );

    if (ramText) {

        ramText.textContent =
            `${data.ram_used_gb || 0} GB / ${
                data.ram_total_gb || 0
            } GB`;
    }


    // --------------------------------------------------------
    // UPTIME
    // --------------------------------------------------------

    const uptime =
        document.getElementById(
            "uptime"
        );

    if (uptime) {

        uptime.textContent =
            data.uptime ||
            "—";
    }


    // --------------------------------------------------------
    // CPU CORES
    // --------------------------------------------------------

    const cores =
        document.getElementById(
            "cores"
        );

    if (cores) {

        cores.textContent =
            data.logical_cores ||
            "—";
    }


    // --------------------------------------------------------
    // ДИСКИ
    // --------------------------------------------------------

    renderDisks(
        data.disks || []
    );


    // --------------------------------------------------------
    // ИНФОРМАЦИЯ О СИСТЕМЕ
    // --------------------------------------------------------

    renderSystemInfo(
        data
    );
}


// ============================================================
// ОТОБРАЖЕНИЕ ДИСКОВ
// ============================================================

function renderDisks(disks) {

    const element =
        document.getElementById(
            "disks"
        );

    if (!element) {
        return;
    }


    if (
        !Array.isArray(disks) ||
        disks.length === 0
    ) {

        element.innerHTML = `
            <div class="muted">
                Диски не найдены
            </div>
        `;

        return;
    }


    element.innerHTML =
        disks
            .map(
                disk => {

                    const percent =
                        Number(
                            disk.percent || 0
                        );

                    return `

                        <div class="disk">

                            <div class="disk-head">

                                <span>
                                    💾
                                    ${escapeHtml(
                                        disk.name
                                    )}
                                </span>

                                <span>
                                    ${percent.toFixed(1)}%
                                </span>

                            </div>

                            <div class="disk-bar">

                                <span
                                    style="
                                        width:
                                        ${Math.min(
                                            100,
                                            Math.max(
                                                0,
                                                percent
                                            )
                                        )}%
                                    "
                                ></span>

                            </div>

                            <div class="disk-info">

                                ${disk.used_gb || 0} GB занято
                                /
                                ${disk.free_gb || 0} GB свободно
                                /
                                ${disk.total_gb || 0} GB всего

                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}


// ============================================================
// ИНФОРМАЦИЯ О СИСТЕМЕ
// ============================================================

function renderSystemInfo(data) {

    const element =
        document.getElementById(
            "systemInfo"
        );

    if (!element) {
        return;
    }


    element.innerHTML = `

        <div class="info-item">
            🖥
            ${escapeHtml(
                data.hostname ||
                "Неизвестно"
            )}
        </div>

        <div class="info-item">
            💿
            ${escapeHtml(
                data.os ||
                "Неизвестно"
            )}
        </div>

        <div class="info-item">
            ⚙️
            ${escapeHtml(
                data.processor ||
                "Неизвестно"
            )}
        </div>

        <div class="info-item">
            🔢
            Физических ядер:
            ${data.physical_cores || "—"}
        </div>

        <div class="info-item">
            🔢
            Логических процессоров:
            ${data.logical_cores || "—"}
        </div>

        <div class="info-item">
            🚀
            Запуск:
            ${escapeHtml(
                data.boot_time ||
                "Неизвестно"
            )}
        </div>
    `;
}


// ============================================================
// ПРОЦЕССЫ
// ============================================================

async function refreshProcesses() {

    const processes =
        await api(
            "/api/processes"
        );

    const table =
        document.getElementById(
            "processes"
        );

    if (!table) {
        return;
    }


    if (
        !Array.isArray(processes) ||
        processes.length === 0
    ) {

        table.innerHTML = `
            <tr>
                <td colspan="4">
                    Процессы не найдены
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        processes
            .map(
                process => `

                    <tr>

                        <td>
                            ${process.pid}
                        </td>

                        <td>
                            ${escapeHtml(
                                process.name
                            )}
                        </td>

                        <td>
                            ${process.cpu || 0}%
                        </td>

                        <td>
                            ${process.memory || 0}%
                        </td>

                    </tr>
                `
            )
            .join("");
}


// ============================================================
// СЕТЬ
// ============================================================

async function refreshNetwork() {

    const network =
        await api(
            "/api/network"
        );

    const element =
        document.getElementById(
            "network"
        );

    if (!element) {
        return;
    }


    if (
        !Array.isArray(network) ||
        network.length === 0
    ) {

        element.innerHTML = `
            <div class="info-item">
                🌐
                Сетевые интерфейсы не найдены
            </div>
        `;

        return;
    }


    element.innerHTML =
        network
            .map(
                item => `

                    <div class="info-item">

                        🌐
                        ${escapeHtml(
                            item.interface ||
                            "Интерфейс"
                        )}

                        —

                        <strong>
                            ${escapeHtml(
                                item.ip ||
                                "Нет IP"
                            )}
                        </strong>

                    </div>
                `
            )
            .join("");
}


// ============================================================
// ЖУРНАЛ
// ============================================================

async function refreshLog() {

    const log =
        await api(
            "/api/log"
        );

    const element =
        document.getElementById(
            "log"
        );

    if (!element) {
        return;
    }


    if (
        !Array.isArray(log) ||
        log.length === 0
    ) {

        element.innerHTML = `
            <div class="muted">
                Действий пока нет
            </div>
        `;

        return;
    }


    element.innerHTML =
        log
            .map(
                item => `

                    <div class="log-item">

                        <strong>
                            ${escapeHtml(
                                item.time
                            )}
                        </strong>

                        —

                        ${escapeHtml(
                            item.action
                        )}

                    </div>
                `
            )
            .join("");
}


// ============================================================
// ОБНОВЛЕНИЕ ВСЕЙ ПАНЕЛИ
// ============================================================

async function refreshAll() {

    try {

        await Promise.all([
            refreshStatus(),
            refreshProcesses(),
            refreshNetwork(),
            refreshLog()
        ]);

    } catch (error) {

        console.error(
            "Ошибка обновления панели:",
            error
        );
    }
}


// ============================================================
// СОЗДАНИЕ СКРИНШОТА
// ============================================================

const screenshotButton =
    document.getElementById(
        "screenshotButton"
    );

if (screenshotButton) {

    screenshotButton.addEventListener(
        "click",
        async function() {

            this.disabled = true;

            try {

                await api(
                    "/api/screenshot",
                    {
                        method: "POST"
                    }
                );

                const image =
                    document.getElementById(
                        "screenshot"
                    );

                if (image) {

                    image.src =
                        "/api/screenshot?" +
                        Date.now();

                    image.classList.remove(
                        "hidden"
                    );
                }

                showToast(
                    "📸 Скриншот создан"
                );

                await refreshLog();

            } catch (error) {

                showToast(
                    error.message
                );

            } finally {

                this.disabled = false;
            }
        }
    );
}


// ============================================================
// УВЕДОМЛЕНИЯ
// ============================================================

let toastTimer = null;


function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );

    if (!toast) {
        return;
    }


    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );


    if (toastTimer) {

        clearTimeout(
            toastTimer
        );
    }


    toastTimer =
        setTimeout(
            function() {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );
}


// ============================================================
// ЗАЩИТА ОТ HTML
// ============================================================

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(
            /[&<>"']/g,
            function(character) {

                const entities = {

                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                };

                return entities[
                    character
                ];
            }
        );
}


// ============================================================
// ЗАПУСК
// ============================================================

(async function() {

    const authorized =
        await checkAuthorization();

    if (!authorized) {
        return;
    }

    await refreshAll();

})();


// ============================================================
// АВТООБНОВЛЕНИЕ
// ============================================================

// Обновляем данные каждые 5 секунд.

setInterval(
    async function() {

        const app =
            document.getElementById(
                "app"
            );

        if (
            app &&
            !app.classList.contains(
                "hidden"
            )
        ) {

            try {

                await refreshAll();

            } catch (error) {

                console.error(
                    error
                );
            }
        }

    },
    5000
);