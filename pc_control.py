import os
import platform
import socket
import subprocess
import time
import webbrowser
from datetime import datetime
from typing import Optional

import psutil


# ============================================================
# НАСТРОЙКИ WINDOWS
# ============================================================

CREATE_NO_WINDOW = getattr(
    subprocess,
    "CREATE_NO_WINDOW",
    0
)


# ============================================================
# ПРОВЕРКА WINDOWS
# ============================================================

def is_windows() -> bool:
    """
    Проверяет, запущен ли код на Windows.
    """

    return platform.system().lower() == "windows"


# ============================================================
# ВЫПОЛНЕНИЕ КОМАНДЫ WINDOWS
# ============================================================

def run_command(
    command,
    timeout: int = 10
) -> Optional[subprocess.CompletedProcess]:
    """
    Выполняет команду Windows.

    command:
        Список аргументов команды.

    timeout:
        Максимальное время ожидания.
    """

    try:

        return subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            creationflags=CREATE_NO_WINDOW,
            encoding="utf-8",
            errors="replace"
        )

    except subprocess.TimeoutExpired:
        print(
            f"[PC_CONTROL] Таймаут команды: {command}"
        )

    except FileNotFoundError:
        print(
            f"[PC_CONTROL] Команда не найдена: {command}"
        )

    except Exception as error:
        print(
            f"[PC_CONTROL] Ошибка команды: {error}"
        )

    return None


# ============================================================
# ВЫКЛЮЧЕНИЕ ПК
# ============================================================

def shutdown_pc(delay: int = 5):
    """
    Выключает компьютер через delay секунд.
    """

    if not is_windows():
        return None

    delay = max(0, int(delay))

    return run_command([
        "shutdown",
        "/s",
        "/t",
        str(delay)
    ])


# ============================================================
# ПЕРЕЗАГРУЗКА ПК
# ============================================================

def restart_pc(delay: int = 5):
    """
    Перезагружает компьютер через delay секунд.
    """

    if not is_windows():
        return None

    delay = max(0, int(delay))

    return run_command([
        "shutdown",
        "/r",
        "/t",
        str(delay)
    ])


# ============================================================
# ОТМЕНА ВЫКЛЮЧЕНИЯ
# ============================================================

def cancel_shutdown():
    """
    Отменяет запланированное выключение
    или перезагрузку.
    """

    if not is_windows():
        return None

    return run_command([
        "shutdown",
        "/a"
    ])


# ============================================================
# БЛОКИРОВКА WINDOWS
# ============================================================

def lock_pc():
    """
    Блокирует текущий сеанс Windows.
    """

    if not is_windows():
        return None

    return run_command([
        "rundll32.exe",
        "user32.dll,LockWorkStation"
    ])


# ============================================================
# СПЯЩИЙ РЕЖИМ
# ============================================================

def sleep_pc():
    """
    Переводит компьютер в спящий режим.
    """

    if not is_windows():
        return None

    # Используем rundll32 вместо PowerShell.
    return run_command([
        "rundll32.exe",
        "powrprof.dll,SetSuspendState",
        "Sleep"
    ])


# ============================================================
# ЗВУК
# ============================================================

def mute_volume():
    """
    Переключает состояние системного звука Windows.

    Если звук включён → выключает.
    Если выключен → включает.
    """

    if not is_windows():
        return False

    try:

        import ctypes

        VK_VOLUME_MUTE = 0xAD

        ctypes.windll.user32.keybd_event(
            VK_VOLUME_MUTE,
            0,
            0,
            0
        )

        ctypes.windll.user32.keybd_event(
            VK_VOLUME_MUTE,
            0,
            2,
            0
        )

        return True

    except Exception as error:

        print(
            f"[PC_CONTROL] Ошибка управления звуком: {error}"
        )

        return False


# ============================================================
# СВЕРНУТЬ ВСЕ ОКНА
# ============================================================

def minimize_all_windows():
    """
    Сворачивает все окна Windows.

    Используется сочетание Win + D.
    """

    if not is_windows():
        return False

    try:

        import ctypes

        VK_LWIN = 0x5B
        VK_D = 0x44

        # Нажимаем Win
        ctypes.windll.user32.keybd_event(
            VK_LWIN,
            0,
            0,
            0
        )

        # Нажимаем D
        ctypes.windll.user32.keybd_event(
            VK_D,
            0,
            0,
            0
        )

        # Отпускаем D
        ctypes.windll.user32.keybd_event(
            VK_D,
            0,
            2,
            0
        )

        # Отпускаем Win
        ctypes.windll.user32.keybd_event(
            VK_LWIN,
            0,
            2,
            0
        )

        return True

    except Exception as error:

        print(
            f"[PC_CONTROL] Ошибка сворачивания окон: {error}"
        )

        return False


# ============================================================
# ОТКРЫТЬ ПРИЛОЖЕНИЕ
# ============================================================

def open_application(path: str) -> bool:
    """
    Открывает приложение по указанному пути.

    Например:

    open_application(
        r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    )
    """

    if not path:
        return False

    try:

        path = os.path.expandvars(
            os.path.expanduser(path)
        )

        if not os.path.exists(path):
            print(
                f"[PC_CONTROL] Файл не найден: {path}"
            )
            return False

        os.startfile(path)

        return True

    except Exception as error:

        print(
            f"[PC_CONTROL] Ошибка открытия приложения: {error}"
        )

        return False


# ============================================================
# ЗАПУСК ПРОГРАММЫ ПО КОМАНДЕ
# ============================================================

def run_program(command: str) -> bool:
    """
    Запускает программу или команду.

    Примеры:

        run_program("notepad.exe")

        run_program("explorer.exe")

        run_program("cmd.exe")
    """

    if not command:
        return False

    try:

        subprocess.Popen(
            command,
            shell=True,
            creationflags=CREATE_NO_WINDOW
        )

        return True

    except Exception as error:

        print(
            f"[PC_CONTROL] Ошибка запуска программы: {error}"
        )

        return False


# ============================================================
# ОТКРЫТЬ ПАПКУ
# ============================================================

def open_folder(path: str) -> bool:
    """
    Открывает папку в Проводнике Windows.
    """

    if not path:
        return False

    try:

        path = os.path.expandvars(
            os.path.expanduser(path)
        )

        if not os.path.isdir(path):
            print(
                f"[PC_CONTROL] Папка не найдена: {path}"
            )
            return False

        os.startfile(path)

        return True

    except Exception as error:

        print(
            f"[PC_CONTROL] Ошибка открытия папки: {error}"
        )

        return False


# ============================================================
# ОТКРЫТЬ САЙТ
# ============================================================

def open_website(url: str) -> bool:
    """
    Открывает сайт в браузере.
    """

    if not url:
        return False

    try:

        return webbrowser.open(url)

    except Exception as error:

        print(
            f"[PC_CONTROL] Ошибка открытия сайта: {error}"
        )

        return False


# ============================================================
# ИНФОРМАЦИЯ О СИСТЕМЕ
# ============================================================

def get_system_info():
    """
    Возвращает основную информацию о компьютере.
    """

    # Время запуска Windows
    boot_timestamp = psutil.boot_time()

    boot_time = datetime.fromtimestamp(
        boot_timestamp
    )

    # Uptime
    uptime_seconds = max(
        0,
        int(time.time() - boot_timestamp)
    )

    days, remainder = divmod(
        uptime_seconds,
        86400
    )

    hours, remainder = divmod(
        remainder,
        3600
    )

    minutes, seconds = divmod(
        remainder,
        60
    )

    # RAM
    memory = psutil.virtual_memory()

    # Диски
    disks = []

    for partition in psutil.disk_partitions(
        all=False
    ):

        try:

            # Пропускаем CD/DVD и другие
            # неподходящие устройства
            if "cdrom" in partition.opts.lower():
                continue

            usage = psutil.disk_usage(
                partition.mountpoint
            )

            disks.append({
                "name": partition.mountpoint,

                "total_gb": round(
                    usage.total / 1024**3,
                    1
                ),

                "used_gb": round(
                    usage.used / 1024**3,
                    1
                ),

                "free_gb": round(
                    usage.free / 1024**3,
                    1
                ),

                "percent": usage.percent
            })

        except (
            PermissionError,
            OSError
        ):
            continue

    return {
        "hostname": socket.gethostname(),

        "os": platform.platform(),

        "windows": platform.system(),

        "processor": (
            platform.processor()
            or platform.machine()
            or "Неизвестно"
        ),

        "cpu_percent": psutil.cpu_percent(
            interval=0.5
        ),

        "physical_cores": (
            psutil.cpu_count(
                logical=False
            ) or 0
        ),

        "logical_cores": (
            psutil.cpu_count(
                logical=True
            ) or 0
        ),

        "ram_total_gb": round(
            memory.total / 1024**3,
            1
        ),

        "ram_used_gb": round(
            memory.used / 1024**3,
            1
        ),

        "ram_free_gb": round(
            memory.available / 1024**3,
            1
        ),

        "ram_percent": memory.percent,

        "boot_time": boot_time.strftime(
            "%Y-%m-%d %H:%M:%S"
        ),

        "uptime": (
            f"{days}д "
            f"{hours:02d}ч "
            f"{minutes:02d}м "
            f"{seconds:02d}с"
        ),

        "disks": disks
    }


# ============================================================
# ПРОЦЕССЫ
# ============================================================

def get_processes(limit: int = 15):
    """
    Возвращает процессы, отсортированные
    по загрузке CPU.
    """

    limit = max(
        1,
        int(limit)
    )

    processes = []

    # Первый вызов CPU_percent инициализирует
    # измерение для процессов.
    for process in psutil.process_iter([
        "pid",
        "name",
        "memory_percent"
    ]):

        try:

            process.cpu_percent(
                interval=None
            )

        except (
            psutil.NoSuchProcess,
            psutil.AccessDenied
        ):
            continue

    # Небольшой интервал для нормального
    # измерения загрузки CPU.
    time.sleep(0.15)

    for process in psutil.process_iter([
        "pid",
        "name",
        "memory_percent"
    ]):

        try:

            cpu = process.cpu_percent(
                interval=None
            )

            memory = process.memory_percent()

            processes.append({
                "pid": process.pid,

                "name": (
                    process.info.get("name")
                    or "Неизвестно"
                ),

                "cpu": round(
                    cpu or 0,
                    1
                ),

                "memory": round(
                    memory or 0,
                    1
                )
            })

        except (
            psutil.NoSuchProcess,
            psutil.AccessDenied,
            psutil.ZombieProcess
        ):
            continue

    processes.sort(
        key=lambda item: item["cpu"],
        reverse=True
    )

    return processes[:limit]


# ============================================================
# СЕТЕВАЯ ИНФОРМАЦИЯ
# ============================================================

def get_network_info():
    """
    Возвращает IPv4-адреса сетевых интерфейсов.
    """

    interfaces = []

    for interface, addresses in (
        psutil.net_if_addrs().items()
    ):

        for address in addresses:

            if address.family == socket.AF_INET:

                interfaces.append({
                    "interface": interface,
                    "ip": address.address
                })

    return interfaces


# ============================================================
# ПРОВЕРКА ПК
# ============================================================

def is_pc_running() -> bool:
    """
    Если Python выполняется, ПК включён.
    """

    return True


# ============================================================
# СКРИНШОТ
# ============================================================

def screenshot(path: str):
    """
    Делает скриншот всех доступных мониторов.

    Требуется Pillow:

        pip install pillow
    """

    if not path:
        raise ValueError(
            "Не указан путь для скриншота."
        )

    try:

        from PIL import ImageGrab

    except ImportError as error:

        raise RuntimeError(
            "Не установлен Pillow. "
            "Установи: pip install pillow"
        ) from error

    try:

        image = ImageGrab.grab(
            all_screens=True
        )

        image.save(
            path,
            "PNG"
        )

        return path

    except Exception as error:

        raise RuntimeError(
            f"Не удалось сделать скриншот: {error}"
        ) from error