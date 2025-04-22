---
title: Vulkan Tutorial 02 Drawing a Triangle
date: 2024-05-01 22:41 +0800
categories: [Graphics, Vulkan Collections]
media_subpath: /assets/img/Graphics/vulkan collections/
math: false
---

### 1 Setup

#### 1.1 Base Code

##### General Structure

当我们配置好Vulkan项目后，就可以创建应用程序的基本框架了：

```c++
#include <vulkan/vulkan.h>

#include <iostream>
#include <stdexcept>
#include <cstdlib>

class HelloTriangleApplication {
public:
    void run() {
        initVulkan();
        mainLoop();
        cleanup();
    }

private:
    void initVulkan() {}

    void mainLoop() {}

    void cleanup() {}
};

int main() {
    HelloTriangleApplication app;

    try {
        app.run();
    } catch (const std::exception& e) {
        std::cerr << e.what() << std::endl;
        return EXIT_FAILURE;
    }

    return EXIT_SUCCESS;
}
```

##### Resource Management

就像每块通过`malloc`分配的内存都需要调用`free`来释放一样，我们创建的每个Vulkan对象在不再需要时都必须显式销毁。在C++中，可以使用**RAII**或头文件提供的智能指针实现自动资源管理。但在本系列博客中，**我们选择显式处理Vulkan对象的创建和销毁**。毕竟，Vulkan的核心理念就是显式控制每个操作以避免错误，因此通过显式管理对象生命周期来学习API工作机制是很有益的。

阅读完本系列博客后，您可以通过以下方式实现自动资源管理：

- 编写C++类在构造函数中获取Vulkan对象并在析构函数中释放，或者
- 根据所有权需求为`std::unique_ptr`或`std::shared_ptr`提供自定义删除器。

对于大型Vulkan项目推荐使用RAII模型，但出于学习目的，了解底层机制总是有益的。

Vulkan对象主要通过两种方式创建：直接使用`vkCreateXXX`类函数，或通过其他对象使用`vkAllocateXXX`类函数分配。在确认对象不再被使用后，需要使用对应的`vkDestroyXXX`和`vkFreeXXX`函数销毁。这些函数的参数通常因对象类型而异，但都有一个共同参数：`pAllocator`。这是用于指定自定义内存分配器回调的可选参数，本教程中将忽略该参数，始终传递`nullptr`。

##### Integrating GLFW

```c++
void initWindow() 
{
    glfwInit();
	glfwWindowHint(GLFW_CLIENT_API, GLFW_NO_API);
    glfwWindowHint(GLFW_RESIZABLE, GLFW_FALSE);
    window = glfwCreateWindow(WIDTH, HEIGHT, "Vulkan", nullptr, nullptr);
}

void mainLoop() 
{
    while (!glfwWindowShouldClose(window)) 
    {
        glfwPollEvents();
    }
}

void cleanup() 
{
    glfwDestroyWindow(window);
    glfwTerminate();
}
```

到这一步，运行程序时，我们就会得到一个窗口了。

#### 1.2 Instance

编写一个Vulkan程序的第一步是创建一个实例对象，该实例对象是应用程序与Vulkan库之间的连接。

在创建过程中，我们需要将一些与应用程序相关的细节指定给驱动。首先我们需要准备一个`VkApplicationInfo`结构体

```c++
void createInstance() 
{
    VkApplicationInfo appInfo{};
    appInfo.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
    appInfo.pApplicationName = "Hello Triangle";
    appInfo.applicationVersion = VK_MAKE_VERSION(1, 0, 0);
    appInfo.pEngineName = "No Engine";
    appInfo.engineVersion = VK_MAKE_VERSION(1, 0, 0);
    appInfo.apiVersion = VK_API_VERSION_1_0;
}
```

创建好的`VkApplicationInfo`需要传递给`VkInstanceCreateInfo`结构体：

```c++
VkInstanceCreateInfo createInfo{};
createInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
createInfo.pApplicationInfo = &appInfo;
```

然后，我们再指定出需要用的到扩展与Layer，就可以调用`vkCreateInstance()`完成创建了。

#### 1.3 Validation Layers

Vulkan API 的设计核心理念是**最小化驱动开销**，其中一个典型体现是：默认情况下，API 本身几乎不进行错误检查。即便是简单的错误（例如为枚举类型设置了非法值，或向必需参数传递了空指针），通常也不会被显式处理，而是直接导致程序崩溃或未定义行为。由于 Vulkan 要求开发者明确指定所有操作细节，开发者很容易犯一些低级错误，例如启用了新的 GPU 特性却忘记在创建逻辑设备时声明支持。

然而，这并不意味着 Vulkan 无法添加这类检查。为此，Vulkan 引入了一个优雅的机制——**验证层（Validation Layers）**。验证层是可选组件，它们会介入 Vulkan 函数调用，执行额外的操作。常见的验证层功能包括：

- **参数校验**：根据规范检查参数值，防止 API 误用
- **对象生命周期追踪**：监控对象的创建和销毁，检测资源泄漏
- **线程安全检查**：追踪调用来源的线程，确保线程安全规则
- **调用日志记录**：将每个调用及其参数记录到标准输出
- **调用追踪**：记录 Vulkan 调用序列，用于性能分析和场景回放

通过启用验证层，开发者可以在开发阶段高效定位问题，而无需在最终发布的程序中承担额外的运行时开销。这种设计平衡了开发便利性与运行效率，体现了 Vulkan 对「显式控制」原则的贯彻。

#### 1.4 Physical Devices and Queue Families

##### Selecting a Physical Device

当创建好`VkInstance`后，我们需要寻找并选择系统中的满足要求的显卡。实际上我们可以先选择多个显卡并同步使用，只是在我们的三角形案例中没有必要这样。

##### Queue Families

前文曾简要提到，Vulkan中几乎所有操作（从图形绘制到纹理上传）都需要将命令提交到队列。队列类型多样，且均源自不同的队列族，每个队列族仅允许执行特定类型的命令。例如，某个队列族可能仅处理计算命令，而另一个队列族可能仅支持内存传输命令。

我们需要检查设备支持的队列族，并确定其中哪些支持我们需使用的命令。为此，新增一个`findQueueFamilies()`函数，用于查找所有需要的队列族。

考虑到我们需要使用不止一个队列族，我们可以创建一个存储队列族索引的结构体，并让该函数返回一个这样的结构体实例：

```c++
struct QueueFamilyIndices 
{
    std::optional<uint32_t> graphicsFamily;
};

QueueFamilyIndices findQueueFamilies(VkPhysicalDevice device) 
{
    QueueFamilyIndices indices;
    // Logic to find queue family indices to populate struct with
    return indices;
}
```

获取队列族的代码如下：

```c++
uint32_t queueFamilyCount = 0;
vkGetPhysicalDeviceQueueFamilyProperties(device, &queueFamilyCount, nullptr);

std::vector<VkQueueFamilyProperties> queueFamilies(queueFamilyCount);
vkGetPhysicalDeviceQueueFamilyProperties(device, &queueFamilyCount, queueFamilies.data());
```

`VkQueueFamilyProperties`结构体包含了关于队列族的更多细节，例如该队列族所支持的操作类型，以及该队列族可以创建的队列数量。例如，我们可以通过`queueFamily.queueFlags & VK_QUEUE_GRAPHICS_BIT`来筛选一个支持图形操作的队列族。

#### 1.5 Logical Device and Queues

##### Introduction

选定物理设备后，需创建对应的逻辑设备进行交互。逻辑设备的创建过程与实例创建类似，需声明要启用的功能特性。由于已查询到可用的队列族，还需在此指定要创建的队列类型。若有不同需求，甚至可基于同一物理设备创建多个逻辑设备。

##### Specifying Queues to Be Created

创建逻辑设备需通过结构体指定多项参数，首个关键结构体是`VkDeviceQueueCreateInfo`。该结构体定义针对单个队列族要创建的队列数量（如每个族至少一个队列）及优先级。目前我们仅需关注支持图形能力的队列。

"Vulkan 允许为队列分配优先级（取值范围为0.0到1.0的浮点数），以此影响命令缓冲执行的调度顺序。**即使只创建单个队列，也必须指定优先级。**"

##### Specifying Used Device Features

接下来需配置要启用的设备特性。这些特性即前文通过 `vkGetPhysicalDeviceFeatures` 查询支持的选项（如几何着色器）。目前无需启用任何高级特性，因此只需定义 `VkPhysicalDeviceFeatures` 结构体，并将所有字段设为 `VK_FALSE`。待后续实现更复杂功能时，我们会重新配置此结构体。"

##### Creating the Logical Device

现在，我们可以来填充`VkDeviceCreateInfo`结构体了。首先，将前面准备好的`VkDeviceQueueCreateInfo` 与`VkPhysicalDeviceFeatures`指定好。

"接下来的配置步骤与 `VkInstanceCreateInfo` 结构体类似，需指定扩展和验证层，但此处配置的是设备特定的参数。

设备特定扩展的典型例子是 `VK_KHR_swapchain`，它允许将渲染完成的图像从设备呈现到窗口。某些Vulkan设备可能不支持此功能，例如仅支持计算操作的设备

旧版Vulkan曾区分实例级和设备级验证层，但此设计已被废弃。这意味着，现代Vulkan实现会忽略 `VkDeviceCreateInfo` 中的 `enabledLayerCount` 和 `ppEnabledLayerNames` 字段。

##### Retrieving Queue Handles

在创建逻辑设备时，我们指定了要创建的队列的信息，所以队列会随逻辑设备自动创建，但我们尚未获取其操作句柄。首先需在类中添加私有成员变量（如 `VkQueue m_graphicsQueue`）来存储图形队列句柄。

设备队列会随逻辑设备销毁隐式清理，因此无需在 `cleanup` 函数中显式释放队列资源。

通过 `vkGetDeviceQueue` 函数可获取各队列族的队列句柄。其参数依次为：逻辑设备、队列族索引、队列索引，以及存储句柄的变量指针。由于当前每个队列族仅创建一个队列，直接使用索引0即可。"

---

### 2 Presentation

#### 2.1 Window Surface

由于Vulkan是平台无关的API，其自身无法直接对接窗口系统。为了建立Vulkan与窗口系统的连接以便将渲染结果呈现至屏幕，需使用WSI（窗口系统集成）扩展。本章将讨论首个关键扩展——`VK_KHR_surface`。该扩展提供了`VkSurfaceKHR`对象，用于抽象表示可呈现渲染图像的表面类型。在我们的程序中，此表面实际由GLFW创建的窗口实现。

`VK_KHR_surface` 是实例级扩展，由于该扩展已被 `glfwGetRequiredInstanceExtensions` 返回的列表包含，我们实际上已在创建实例时启用了它。该列表还包含其他WSI扩展，我们将在后续几章中使用它们。

当我们创建好`VkInstance`后，就应该立即创建窗口表面，这是因为它能够影响到物理设备的选择。

##### Window Surface Creation

GLFW为我们封装了创建窗口表面的过程，具体的函数调用为`glfwCreateWindowSurface()`

##### Querying for Presentation Support

尽管Vulkan实现可能支持窗口系统集成（WSI），但这并不保证系统中的所有物理设备均支持此功能。因此，我们需要确保设备能向已创建的表面呈现图像。由于呈现是队列族专属功能，核心在于寻找支持向目标表面呈现的队列族

支持图形命令的队列族与支持呈现的队列族可能完全独立。因此，我们需要将这个因素考虑在内，即为用于呈现的队列族创建一个单独的索引值。

具体来说，我们通过调用函数`vkGetPhysicalDeviceSurfaceSupportKHR()`来判断某个索引所对应的队列族是否支持呈现：

```c++
VkBool32 presentSupport = false;
vkGetPhysicalDeviceSurfaceSupportKHR(device, i, surface, &presentSupport);
```

Note that it's very likely that these end up being the same queue family after all, but throughout the program we will treat them as if they were separate queues for a uniform approach. Nevertheless, you could add logic to explicitly prefer a physical device that supports drawing and presentation in the same queue for improved performance.

需注意，图形队列族与呈现队列族通常为同一队列族，但在代码中仍会将其视为独立队列以保证逻辑一致性。开发者也可添加判定逻辑，**显式优先选择支持图形与呈现队列族相同的物理设备，以优化性能**。

##### Creating the Presentation Queue

现在，我们需要修改创建逻辑设备的代码中，以确保我们创建一个用于呈现的队列。具体来说，我们需要将创建呈现队列的`VkDeviceQueueCreateInfo`添加到对应的数组中。

创建逻辑设备完成后，我们还需要获取用于呈现队列的句柄。

#### 2.2 Swap Chain

Vulkan 不存在「默认帧缓冲」的概念，因此需要一种管理渲染目标图像缓冲的机制——即**交换链**，且必须显式创建。交换链本质上是等待屏幕呈现的图像队列：应用程序从中获取图像进行渲染，完成后将图像交还队列。队列的具体运作机制及图像呈现条件取决于交换链的配置方式，但其核心目的是实现图像呈现与屏幕刷新率的同步。

##### Checking for Swap Chain Support

由于某些原因（例如专为服务器设计且无显示输出的图形设备），并非所有显卡都能直接将图像呈现到屏幕。其次，图像呈现高度依赖窗口系统及关联表面，因此并不属于Vulkan核心功能，需通过设备扩展实现。为此，必须查询设备支持后启用 `VK_KHR_swapchain` 扩展。

基于以上，我们需要扩展函数`isDeviceSuitable()`，以判断该扩展是否支持。首先，我们声明一个所需的设备扩展的列表：

```c++
const std::vector<const char*> deviceExtensions = 
{
    VK_KHR_SWAPCHAIN_EXTENSION_NAME
};
```

然后通过下面这个函数用于判断是否所有deviceExtensions中的扩展都能够被支持：

```c++
bool checkDeviceExtensionSupport(VkPhysicalDevice device) 
{
    uint32_t extensionCount;
    vkEnumerateDeviceExtensionProperties(device, nullptr, &extensionCount, nullptr);

    std::vector<VkExtensionProperties> availableExtensions(extensionCount);
    vkEnumerateDeviceExtensionProperties(device, nullptr, &extensionCount, availableExtensions.data());

    std::set<std::string> requiredExtensions(deviceExtensions.begin(), deviceExtensions.end());

    for (const auto& extension : availableExtensions) {
        requiredExtensions.erase(extension.extensionName);
    }

    return requiredExtensions.empty();
}
```

##### Enabling Device Extensions

使用交换链，需要我们首先启用`VK_KHR_swapchain`扩展。具体则是要修改逻辑设备的创建结构体。

```c++
createInfo.enabledExtensionCount = static_cast<uint32_t>(deviceExtensions.size());
createInfo.ppEnabledExtensionNames = deviceExtensions.data();
```

##### Querying Details of Swap Chain Support

Just checking if a swap chain is available is not sufficient, because it may not actually be compatible with our window surface. Creating a swap chain also involves a lot more settings than instance and device creation, so we need to query for some more details before we're able to proceed.

There are basically three kinds of properties we need to check:

- Basic surface capabilities (min/max number of images in swap chain, min/max width and height of images)
- Surface formats (pixel format, color space)
- Available presentation modes

仅检查交换链是否可用并不充分，因为它可能与表面不兼容。此外，创建交换链需配置的参数远多于实例和设备创建，因此必须进一步查询详细信息。

基本上，我们需要检查以下三个属性：

- **基础表面能力**（交换链图像数量的最小/最大值、图像宽高的最小/最大值）
- **表面格式**（像素格式、颜色空间）
- **可用呈现模式**

我们可以声明一个结构体用于存储以上属性：

```c++
struct SwapChainSupportDetails
{
    VkSurfaceCapabilitiesKHR capabilities;
    std::vector<VkSurfaceFormatKHR> formats;
    std::vector<VkPresentModeKHR> presentModes;
};
```

接下里，我们声明一个函数，用于查询这些属性：

```c++
SwapChainSupportDetails querySwapChainSupport(VkPhysicalDevice device) 
{
    SwapChainSupportDetails details;

    return details;
}
```

首先是表面能力：

```c++
vkGetPhysicalDeviceSurfaceCapabilitiesKHR(device, surface, &details.capabilities);
```

然后是表面格式：

```c++
uint32_t formatCount;
vkGetPhysicalDeviceSurfaceFormatsKHR(device, surface, &formatCount, nullptr);

if (formatCount != 0) 
{
    details.formats.resize(formatCount);
    vkGetPhysicalDeviceSurfaceFormatsKHR(device, surface, &formatCount, details.formats.data());
}
```

最后是呈现模式：

```c++
uint32_t presentModeCount;
vkGetPhysicalDeviceSurfacePresentModesKHR(device, surface, &presentModeCount, nullptr);

if (presentModeCount != 0)
{
    details.presentModes.resize(presentModeCount);
    vkGetPhysicalDeviceSurfacePresentModesKHR(device, surface, &presentModeCount, details.presentModes.data());
}
```

##### Choosing the Right Settings for Swap Chain

由于交换链的属性存在多种可能，我们需要选择一个恰当的设置来满足我们的要求。

**表面格式**

选择非线性色彩空间、SRGB颜色格式

**呈现模式**

**呈现模式**是交换链最关键的配置项，它定义了图像实际显示到屏幕的条件。Vulkan 支持四种呈现模式：

1. **`VK_PRESENT_MODE_IMMEDIATE_KHR`**
   应用程序提交的图像会立即显示到屏幕，​**​可能导致画面撕裂​**​。
2. **`VK_PRESENT_MODE_FIFO_KHR`**（垂直同步）
   交换链作为队列工作：屏幕刷新时从队首取出图像显示，应用程序将渲染完成的图像插入队尾。若队列已满，应用程序必须等待。此模式类似现代游戏的垂直同步技术，屏幕刷新时刻称为​**​垂直消隐期（vertical blank）​**​。
3. **`VK_PRESENT_MODE_FIFO_RELAXED_KHR`**
   仅在应用程序延迟提交且​**​上一次垂直消隐期队列为空​**​时与前模式不同：图像到达后立即显示而非等待下次垂直消隐，​**​可能导致可见撕裂​**​。
4. **`VK_PRESENT_MODE_MAILBOX_KHR`**（三重缓冲）
   队列满时不阻塞应用程序，而是用新图像替换已排队图像。此模式可在避免撕裂的同时尽可能高速渲染帧，相比标准垂直同步​**​延迟更低​**​。尽管常被称为“三重缓冲”，但仅存在三个缓冲区并不保证帧率不受限。"

**交换Extent**

表示交换链图像的分辨率，通常来说与窗口的分辨率相同。

##### Creating the Swap Chain

