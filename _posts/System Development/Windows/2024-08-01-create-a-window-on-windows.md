---
title: 在Windows系统中创建一个窗口程序
date: 2024-08-01 22:54 +0800
categories: [System Development, Windows]
---

本篇博客记录一下如何在Windows平台下创建一个窗口系统，并梳理出一个简易的框架，为实现软光栅器做铺垫。

### Enter the Infinite Loop

如果我们通过Visual Studio的项目模板“Windows Desktop Application”创建了一个项目，那么程序的entry point会被命名为`wWinMain()`，它是专门为Windows GUI程序设计的入口点。这并非是必须的，所以我们还是将entry point命名为`main()`。`main()`函数的结构如下：

```c++
int main()
{
    HINSTANCE hInstance = GetModuleHandle(nullptr);
    CreateAndRegisterWindow(hInstance);
    MSG msg;
    while(true)
    {
        while(PeekMessage(&msg, nullptr, 0, 0, PM_PREMOVE) != 0)
        {
            TranslateMessage(&msg);
            DispatchMessage(&msg);
            if (msg.message == WM_QUIT) break;
        }
        if (msg.message == WM_QUIT) break;
        DoSomeWork();
    }
}
```

对我们来说，使用`wMinMain`唯一的原因是，当使用 `wWinMain` 作为入口点时，操作系统会直接向该函数传递一个 `HINSTANCE` 参数。我们可以将`HINSTANCE`理解为应用程序实例的标识符，通常在创建窗口和加载资源时使用。由于我们使用`main`作为入口点，我们需要调用函数`GetModuleHandle(nullptr)`自行创建一个`HINSTANCE`参数，其中参数`nullptr`表示函数会返回当前程序的句柄。

然后我们会调用函数`CreateAndRegisterWindow(hInstance)`来创建并注册窗口，该函数是我们自己定义并实现的，我们会专门讨论这个函数，这里就暂时跳过。

一旦窗口创建成功并开始运行，我们就会进入无限循环中，可以看到，我们使用两个循环。外层的循环用于确保程序持续运行，并调用`DoSomeWork()`函数执行主循环逻辑，如渲染、动画处理等。内层循环通过调用`PeekMessage`从消息队列中提取所有待处理的消息，并将它们交给`TranslateMessage`和`DispatchMessage`函数处理，同时确保在每次迭代后消息队列为空，防止消息积压，从而提高程序的响应速度。

为什么要使用两个循环结构呢？内层循环优先处理所有消息，确保用户输入和系统消息得到及时响应。这样可以提高应用程序的响应性，防止用户操作延迟。外层循环确保在没有消息时，程序可以继续执行后台任务或主逻辑。这对于需要实时更新的应用程序（如游戏、动画、实时数据处理）尤为重要。

`PeekMessage` 是一个 Windows API 函数，用于检查消息队列中是否有消息存在，并且可以从消息队列中取出消息（如果有），但不等待消息到达。与 `GetMessage` 不同，`GetMessage` 会阻塞等待消息的到来，而 `PeekMessage` 则不会阻塞，因此它常用于需要不断检查消息队列的场景。该函数的原型为：

```c++
BOOL PeekMessage(LPMSG lpMsg, HWND  hWnd, UINT wMsgFilterMin, UINT wMsgFilterMax, UINT wRemoveMsg);
```

其中：

- **`lpMsg`**:
  - 指向一个 `MSG` 结构体，该结构体接收从消息队列中检索到的消息信息。
- **`hWnd`**:
  - 指定要检索其消息队列的窗口句柄。如果为 `NULL`，则检索属于当前线程的所有消息。
- **`wMsgFilterMin`** 和 **`wMsgFilterMax`**:
  - 指定要检索的消息范围。如果 `wMsgFilterMin` 和 `wMsgFilterMax` 都为 `0`，则检索所有消息。
- **`wRemoveMsg`**:
  - 指定如何处理消息。可以是以下值之一：
    - `PM_NOREMOVE`：检查消息队列并返回消息，但不从队列中移除消息。
    - `PM_REMOVE`：检索消息并将其从队列中移除。

`TranslateMessage`负责将键盘消息转换为字符消息，以便应用程序能够正确处理字符输入。而函数`DispatchMessage`将从消息队列中检索到的消息分发到相应的窗口过程进行处理，从而确保窗口能够响应用户输入和其他系统消息。

---

### Creating The Window

函数的实现如下：

```c++
void CreateAndRegisterWindow(HINSTANCE hInstance)
{
    WNDCLASSEX windowClass = {};
    windowClass.cbSize = sizeof(WNDCLASSEX);
    windowClass.lpfnWndProc = WndProc;
    windowClass.hInstance = hInstance;
    windowClass.hCursor = LoadCursor(hInstance, IDC_ARROW); // here I change nullptr to hInstance
    windowClass.hIcon = LoadIcon(hInstance, IDI_APPLICATION);
    windowClass.hIconSm = LoadIcon(hInstance, IDI_APPLICATION);
    windowClass.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    windowClass.lpszMenuName = nullptr;
    windowClass.lpszClassName = CLASSNAME;

    if (!RegisterClassEx(&windowClass))
    {
        MessageBox(nullptr, L"Window Registration Failed", L"Error",
            MB_ICONEXCLAMATION | MB_OK);
    }

    hwnd = CreateWindowEx(
        WS_EX_CLIENTEDGE,
        CLASSNAME,
        L"My Window",
        WS_OVERLAPPEDWINDOW & ~WS_THICKFRAME & ~WS_MAXIMIZEBOX, // non-resizable)
        CW_USEDEFAULT, CW_USEDEFAULT, win_width, win_height,
        nullptr, nullptr, hInstance, nullptr);

    if (hwnd == nullptr)
    {
        MessageBox(nullptr, L"Window Creation Failed", L"Error",
            MB_ICONEXCLAMATION | MB_OK);
    }

    InitializeOffScreenDC(hwnd);

    ShowWindow(hwnd, SW_SHOWDEFAULT);
    UpdateWindow(hwnd);
}
```

首先，我们声明了一个WNDCLASSEX结构体，包含了有关窗口类的各种属性信息，该结构的定义如下：

```c++
typedef struct tagWNDCLASSEX {
    UINT        cbSize;        // 结构体大小
    UINT        style;         // 类样式
    WNDPROC     lpfnWndProc;   // 窗口过程函数指针
    int         cbClsExtra;    // 类附加内存
    int         cbWndExtra;    // 窗口附加内存
    HINSTANCE   hInstance;     // 实例句柄
    HICON       hIcon;         // 图标句柄
    HCURSOR     hCursor;       // 光标句柄
    HBRUSH      hbrBackground; // 背景刷句柄
    LPCTSTR     lpszMenuName;  // 菜单名称
    LPCTSTR     lpszClassName; // 窗口类名
    HICON       hIconSm;       // 小图标句柄
} WNDCLASSEX;
```

其中最重要的三个部分是：

- `lpfnWndProc`：本质上，这是一个指向窗口过程函数的指针，该函数会处理发送到窗口的信息。在我们的程序中，我们将该函数命名为`WndProc`，并在其中处理键盘或鼠标输入等事件，我们将会在后面深入讨论该函数。
- `hInstance`：我们从函数`GetModuleHandle`中获取了`hInstance`，表示模块的实例句柄。在Windows编程中，模块可以是可执行（.exe）文件或动态链接库（.dll）文件。实例句柄是当模块被加载到进程的地址空间时操作系统分配给模块的唯一值。系统和应用程序利用该句柄来识别模块的实例。
- `lpszClassName`：window class的命名，我们将其命名为`CLASSNAME`所记录的字符串。在应用程序中，window class的命名应该是唯一的。

当我们设置好`WNDCLASSEX`实例的成员变量后，我们注册窗口类并检查是否注册成功。如果成功，就可以通过函数`CreateWindowEX`来创建窗口了。该函数提供了一些参数，用于创建我们指定的窗口样式，具体参数的含义我们就不再介绍了，可以参考[**这个链接**](https://learn.microsoft.com/en-us/previous-versions/ms960010(v=msdn.10))中内容。

此外，`CreateWindowEX`会返回一个窗口句柄`hwnd`，用于引用一个窗口对象。通过窗口句柄，应用程序可以与窗口进行交互，例如改变窗口的大小和位置，更新窗口的内容，处理窗口的消息等。

之后，调用`ShowWindow`在屏幕中显示窗口，调用`UpdateWindow`来重新渲染窗口。

最后，我们还没有解释我们自定义的函数`InitializeOffScreenDC(hwnd)`，它与窗口的创建过程没有直接关系。而是与我们程序的主要任务（显示图片）有关。我们会在后面详细讨论。

---

### Handling  The Window's Events

处理信息的函数WndProc的实现如下：

```c++
LRESULT CALLBACK WndProc(HWND _hwnd, UINT msg, WPARAM wParam, LPARAM lParam)
{
    switch (msg)
    {
    case WM_CLOSE:
        if (hBitMap != nullptr)
        {
            DeleteObject(hBitMap);
            hBitMap = nullptr;
        }
        CleanUpOffScreenDC();
        DestroyWindow(_hwnd);
        break;
    case WM_DESTROY:
        PostQuitMessage(0);
        break;
    case WM_LBUTTONDOWN:
        isDrawing = true;
        break;
    case WM_LBUTTONUP:
        isDrawing = false;
        break;
    case WM_MOUSEMOVE:
        {
            int xPos = GET_X_LPARAM(lParam);
            int yPos = GET_Y_LPARAM(lParam);
            if (isDrawing)
            {
                SetPixelColor(pBits, windowWidth, xPos, yPos, 255, 0, 0);
                InvalidateRect(_hwnd, nullptr, TRUE);
            }
            break;
        }
    case WM_ERASEBKGND:
        return 1; // Indicate that background erase is handled
    case WM_PAINT:
        {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(_hwnd, &ps);
            BitBlt(hdc, 0, 0, windowWidth, windowHeight, hdcOffscreen, 0, 0, SRCCOPY);
            EndPaint(_hwnd, &ps);
        }
        break;
    default:
        return DefWindowProc(_hwnd, msg, wParam, lParam);
    }
}
```

函数的返回类型是LRESULT，这是一个长整型，用于返回窗口过程的结果。`CALLBACK` 是一个宏，定义为 `__stdcall`，指定了函数的调用约定。这是一个用于定义函数如何从堆栈中清理参数的标准。Windows API 约定使用 `__stdcall` 调用约定来调用回调函数。

本函数的后两个参数，`wParam` 和 `lParam` 是传递给窗口过程函数 (`WndProc`) 的两个参数，用于提供有关消息的附加信息。前一个参数的类型为 `WPARAM`通常是整数值或句柄（例如键盘按键代码、鼠标按键状态等），而后者通常是一个指针或两个 16 位值的组合（例如鼠标位置、窗口大小等）。

变量`msg`中存储了发送给窗口的事件的类型，我们的思路很简单，用switch-case结构来判断获取的事件的类型，然后执行对应的处理。Windows提供了大量的事件类型，我们可以在这个[**链接**](https://learn.microsoft.com/en-us/windows/win32/winmsg/about-messages-and-message-queues#system-defined-messages)中查看。前缀`WM`代表“Window Messages”，其中也包含了鼠标和键盘的事件。

`WM_ERASEBKGND` 消息用于请求窗口擦除其背景。通过处理此消息，应用程序可以自定义背景擦除行为，优化绘制过程，减少闪烁。在处理 `WM_ERASEBKGND` 消息时，返回非零值表示已经处理了背景擦除，防止系统进行默认的背景擦除。

有一个我们需要重点了解的事件，`WM_PAINT`，它用于通知应用程序窗口需要重绘。它是 Windows 消息处理机制的一部分，当窗口的客户端区域需要更新或重绘时，系统会发送 `WM_PAINT` 消息给窗口过程函数。

在WM_PAINT的case中，分别执行了一下操作：

**`BeginPaint` 函数**：

- `BeginPaint` 是一个 Windows API 函数，用于开始处理 `WM_PAINT` 消息。
- 它填充 `PAINTSTRUCT` 结构，并返回一个设备上下文句柄（HDC），该句柄用于绘制操作。
- `BeginPaint` 函数还会自动处理重绘区域，将无效区域设置为有效，并准备好进行绘制。

```c++
PAINTSTRUCT ps;
HDC hdc = BeginPaint(_hwnd, &ps);
```

**`BitBlt` 函数**：

- `BitBlt` 将离屏设备上下文 `hdcOffscreen` 中的图像复制到窗口的设备上下文 `hdc` 上，起始坐标为 (0, 0)，大小为 `windowWidth` 和 `windowHeight`。

```c++
BitBlt(hdc, 0, 0, windowWidth, windowHeight, hdcOffscreen, 0, 0, SRCCOPY);
```

- 参数解释：
  - `hdc`：目标设备上下文句柄（窗口的设备上下文）。
  - `(0, 0)`：目标矩形的左上角坐标。
  - `windowWidth` 和 `windowHeight`：目标矩形的宽度和高度。
  - `hdcOffscreen`：源设备上下文句柄（离屏设备上下文）。
  - `(0, 0)`：源矩形的左上角坐标。
  - `SRCCOPY`：表示直接复制源位图到目标设备上下文。

**`EndPaint` 函数**：

- `EndPaint` 是一个 Windows API 函数，用于结束 `WM_PAINT` 消息的处理。
- 它会释放设备上下文，并执行一些清理工作。

```c++
EndPaint(_hwnd, &ps);
```

此外，剩余的部分就是我们为实现程序的主要任务要写的代码了，我们需要显示图像，还需要在图像上绘图。当我们按下鼠标左键时，会将布尔值`isDrawing`设置为`true`，从而告诉程序接下来鼠标的运行轨迹将会用作在图像上绘图。我们可以通过宏`GET_X_LPARAM`、`GET_Y_LPARAM`来获取鼠标的X和Y坐标。

`InvalidateRect`用于将窗口的某个矩形区域标记为无效。无效区域会被加入到窗口的更新区域中，系统会随后发送一个 `WM_PAINT` 消息给窗口过程函数，以便重绘该区域。

---

### Creating a Window Compatible Bitmap

剩下的内容都是与我们程序的主要任务相关的函数了

在实现这个功能前，首先需要了解一些概念：

- `HBITMAP`
  - 用于表示位图（bitmap）的句柄。位图是一种用于存储图像数据的图形格式，通常用于保存和操作图像。通过 `HBITMAP` 句柄，应用程序可以在内存中创建、操作和显示位图。
- `HDC`
  -  "Handle to Device Context"（设备上下文句柄）的缩写。设备上下文（DC）是一个结构，包含了在特定设备上进行绘图操作所需的所有信息。
  -  HDC主要用于以下方面：
     - 绘图操作：提供绘图函数所需的环境，允许在设备上进行绘图操作，如绘制线条、文本、图像等。
     - 绘图属性管理 ：管理绘图属性，如当前的绘图颜色、笔、刷、字体等。
     - 坐标转换：提供逻辑坐标与设备坐标之间的转换。

剩下的内容我暂时还不确定

---

### Final : Window Frame Work Codes

下面这个cpp文件可以创建一个最简单窗口：

```c++
#include <cstdint>
#include <fstream>
#include <windows.h>
#include <windowsx.h>
#include <iostream>

// global variables
HWND hwnd;
const wchar_t* WINDOW_CLASSNAME = L"theWindowClass";
uint32_t windowWidth = 640;
uint32_t windowHeight = 480;

LRESULT CALLBACK WndProc(HWND _hwnd, UINT msg, WPARAM wParam, LPARAM lParam)
{
    switch (msg)
    {
    case WM_CLOSE:
        DestroyWindow(_hwnd);
        break;
    case WM_DESTROY:
        PostQuitMessage(0);
        break;
    default:
        return DefWindowProc(_hwnd, msg, wParam, lParam);
    }
}

void CreateAndRegisterWindow(HINSTANCE hInstance)
{
    WNDCLASSEX windowClass = {};
    windowClass.cbSize = sizeof(WNDCLASSEX);
    windowClass.lpfnWndProc = WndProc;
    windowClass.hInstance = hInstance;
    windowClass.lpszClassName = WINDOW_CLASSNAME;
    windowClass.hIcon = LoadIcon(hInstance, IDI_APPLICATION);
    windowClass.hIconSm = LoadIcon(hInstance, IDI_APPLICATION);
    windowClass.hCursor = LoadCursor(hInstance, IDC_ARROW); // here I change nullptr to hInstance
    windowClass.hbrBackground = reinterpret_cast<HBRUSH>(COLOR_WINDOW + 1);
    windowClass.lpszMenuName = nullptr;

    if (!RegisterClassEx(&windowClass))
    {
        MessageBox(nullptr, L"Window Registration Failed", L"Error",
            MB_ICONEXCLAMATION | MB_OK);
    }

    hwnd = CreateWindowEx(
        WS_EX_CLIENTEDGE,
        WINDOW_CLASSNAME,
        L"My Window",
        WS_OVERLAPPEDWINDOW & ~WS_THICKFRAME & ~WS_MAXIMIZEBOX, // non-resizable)
        CW_USEDEFAULT, CW_USEDEFAULT, windowWidth, windowHeight,
        nullptr, nullptr, hInstance, nullptr);

    if (hwnd == nullptr)
    {
        MessageBox(nullptr, L"Window Creation Failed", L"Error",
            MB_ICONEXCLAMATION | MB_OK);
    }

    ShowWindow(hwnd, SW_SHOWDEFAULT);
    UpdateWindow(hwnd);
}

void DoSomeWork() {}

int main()
{
    HINSTANCE hInstance = GetModuleHandle(nullptr);
    CreateAndRegisterWindow(hInstance);
    MSG msg;
    while (true)
    {
        while (PeekMessage(&msg, nullptr, 0, 0, PM_REMOVE) != 0)
        {
            TranslateMessage(&msg);
            DispatchMessage(&msg);
            if (msg.message == WM_QUIT) break;
        }
        if (msg.message == WM_QUIT) break;
        DoSomeWork();
    }
}
```

---

### 补充

#### 自定义背景颜色

使用`WNDCLASSEXW`结构体创建窗口时，我们可以通过设置`bhrBackground`成员来定义窗口的背景刷（背景颜色或图案）。有三种设置的方式

1. **使用系统颜色：**

   你可以使用 `COLOR_*` 常量来设置背景刷，这些常量表示系统默认的颜色。例如，`COLOR_WINDOW` 表示窗口的默认背景色（通常是白色）。

   ```c++
   windowClass.hbrBackground = reinterpret_cast<HBRUSH>(COLOR_WINDOW + 1);
   ```

2. **使用实心颜色刷：**

   使用函数`CreateSolidBrush`创建实心颜色刷。需要在不用时释放内存

   ```c++
   HBRUSH hBrush = CreateSolidBrush(RGB(255, 0, 0)); // 红色
   windowClass.hbrBackground = hBrush;
   ```

3. **使用模式刷：**

   使用`CreatePatternBrush` 函数加载位图，作为背景的填充图案。

   ```c++
   HBITMAP hBitmap = LoadBitmap(hInstance, MAKEINTRESOURCE(IDB_BITMAP1)); // 自定义位图
   HBRUSH hBrush = CreatePatternBrush(hBitmap);
   windowClass.hbrBackground = hBrush;
   ```

需要注意的是，后两种方法需要我们在不需要释放内存，可以定义在析构函数中。