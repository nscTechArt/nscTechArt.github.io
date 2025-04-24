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

我们有了所有用于创建交换链的信息了，现在需要将这些信息填充到`VkSwapchainCreateInfoKHR`结构体中。其中，`imageArrayLayers` 指定了每个图像所包含的层级数量，通常来说都是`1`，除非我们需要开发VR应用：

```c++
VkSwapchainCreateInfoKHR createInfo{};
createInfo.sType = VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR;
createInfo.surface = surface;
createInfo.minImageCount = imageCount;
createInfo.imageFormat = surfaceFormat.format;
createInfo.imageColorSpace = surfaceFormat.colorSpace;
createInfo.imageExtent = extent;
createInfo.imageArrayLayers = 1;
createInfo.imageUsage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT;
```

接下来需指定跨队列族访问的交换链图像处理方式。当图形队列族（`graphicsFamily`）与呈现队列族（`presentFamily`）不同时（如独立计算设备），应用程序会通过图形队列渲染交换链图像，再提交至呈现队列。Vulkan 提供两种资源共享模式：

- **`VK_SHARING_MODE_EXCLUSIVE`（独占模式）**
  图像同一时间仅由一个队列族持有所有权，跨队列族使用时需​**​显式转移所有权​**​。此模式性能最优，但需开发者管理所有权切换（如使用屏障或信号量）。
- **`VK_SHARING_MODE_CONCURRENT`（并发模式）**
  图像可被多个队列族直接访问，​**​无需显式所有权转移​**​。此模式简化了同步逻辑，但因潜在的数据竞争可能引入性能开销。"

若图形队列族与呈现队列族不同（如异构设备），本教程将采用**并发模式**以规避所有权转移的复杂机制（这需要后续讲解的同步对象知识）。并发模式需通过 `queueFamilyIndexCount` 和 `pQueueFamilyIndices` 参数**预先声明共享图像访问的队列族列表**。

而在大多数硬件上（图形与呈现队列族相同），应优先使用**独占模式**，因为并发模式强制要求至少声明两个不同队列族，此时反而需要配置冗余信息。

```c++
QueueFamilyIndices indices = findQueueFamilies(physicalDevice);
uint32_t queueFamilyIndices[] = {indices.graphicsFamily.value(), indices.presentFamily.value()};

if (indices.graphicsFamily != indices.presentFamily) {
    createInfo.imageSharingMode = VK_SHARING_MODE_CONCURRENT;
    createInfo.queueFamilyIndexCount = 2;
    createInfo.pQueueFamilyIndices = queueFamilyIndices;
} else {
    createInfo.imageSharingMode = VK_SHARING_MODE_EXCLUSIVE;
    createInfo.queueFamilyIndexCount = 0; // Optional
    createInfo.pQueueFamilyIndices = nullptr; // Optional
}
```

##### Retrieving Swap Chain Images

现在我们已经完成了交换链图像的创建，那么接下来要做的就是获取交换链中的图像的句柄：

```c++
std::vector<VkImage> swapChainImages;

vkGetSwapchainImagesKHR(device, swapChain, &imageCount, nullptr);
swapChainImages.resize(imageCount);
vkGetSwapchainImagesKHR(device, swapChain, &imageCount, swapChainImages.data());
```

#### 2.3 Image Views

在Vulkan中，在渲染管线中使用任何图像（包括交换链图像）都需要我们创建一个`VkImageView`对象。`VkImageView`顾名思义，它描述了如何访问图像，以及访问图像中的哪个部分，例如，通过`VkImageView`，我们将图像声明为一个不包含任何mipmap层级的2D深度图。

在本小节中，我们将创建一个`createImageView`函数，用于为每个交换链中的图像创建对应的`VkImageView`，以便我们可以在后续将其作为颜色目标使用。

创建`VkImageView`，我们需要填充`VkImageViewCreateInfo`，首先是一些简单的字段：

```c++
VkImageViewCreateInfo createInfo{};
createInfo.sType = VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO;
createInfo.image = swapChainImages[i];
createInfo.viewType = VK_IMAGE_VIEW_TYPE_2D;
createInfo.format = swapChainImageFormat;
createInfo.components.r = VK_COMPONENT_SWIZZLE_IDENTITY;
createInfo.components.g = VK_COMPONENT_SWIZZLE_IDENTITY;
createInfo.components.b = VK_COMPONENT_SWIZZLE_IDENTITY;
createInfo.components.a = VK_COMPONENT_SWIZZLE_IDENTITY;
```

重点在于`subresourceRange`，它描述了图像的目的，以及应该访问图像的哪些部分。这里的Layer依然与VR相关：

```c++
createInfo.subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
createInfo.subresourceRange.baseMipLevel = 0;
createInfo.subresourceRange.levelCount = 1;
createInfo.subresourceRange.baseArrayLayer = 0;
createInfo.subresourceRange.layerCount = 1;
```

有了`VkImageView`，我们就可以将图像作为纹理使用，但仍然无法作为渲染目标使用，这需要我们配置framebuffer。

---

### 3 Graphics Pipeline Basics

#### 3.1 Introduction

在接下来的章节中，我们将逐步搭建用于绘制第一个三角形的图形管线。图形管线是一系列将网格的顶点和纹理数据转换为渲染目标中像素的操作流程。其简化流程如下所示：

![](vulkan_simplified_pipeline.svg)

图中每个阶段的意义为：

- **输入装配器（Input Assembler）**
  从指定缓冲中收集原始顶点数据，支持通过​**​索引缓冲（Index Buffer）​**​复用顶点数据，避免重复存储。
- **顶点着色器（Vertex Shader）**
  逐顶点执行，核心任务是将顶点坐标从模型空间转换到屏幕空间（MVP矩阵变换），并向后续阶段传递顶点属性（如UV坐标、法线）。
- **曲面细分着色器（Tessellation Shaders）**
  根据规则细分几何体以提升网格密度，典型应用包括：砖墙表面、楼梯边缘的近处细节增强，消除平坦感。
- **几何着色器（Geometry Shader）**
  逐图元（三角形/线/点）执行，可增删或修改图元。虽灵活性高，但因​**​多数GPU（除Intel核显）性能开销大​**​，实际应用较少。
- **光栅化阶段（Rasterization）**
  将图元离散化为​**​片元（Fragment）​**​（即帧缓冲中的候选像素），执行操作：
  - **视口裁剪**：丢弃屏幕外片元
  - **属性插值**：顶点属性（如颜色、纹理坐标）在片元间线性插值
  - **深度测试（可选）**：丢弃被遮挡片元（基于深度缓冲）
- **片元着色器（Fragment Shader）**
  对存活的每个片元，计算其写入帧缓冲的​**​颜色值​**​和​**​深度值​**​。输入数据包括插值后的顶点属性（如用于光照计算的纹理坐标、法线向量）。
- **颜色混合阶段（Color Blending）**
  管理同一像素位置多个片元的混合方式：
  - **覆盖（Replace）**：新片元覆盖旧值
  - **叠加（Additive）**：颜色值相加
  - **透明度混合（Alpha Blending）**：按透明度因子混合新旧颜色

图中以绿色标注的阶段称为**固定功能阶段（fixed-function）**。这些阶段允许通过参数调整其行为，但其底层运作机制是硬件预定义的（无法修改核心逻辑）。

而橙色标注的阶段属于**可编程阶段**，开发者可向显卡上传自定义的着色器代码（如GLSL或HLSL）以精确控制运算逻辑。例如，通过编写片元着色器可实现从基础的纹理采样/光照计算到光线追踪等高级效果。这些着色器程序会在GPU的众核架构上**并行执行**，同时处理海量顶点与片元数据。

若曾使用过 OpenGL 或 Direct3D 等传统图形 API，开发者可能习惯于通过 `glBlendFunc` 或 `OMSetBlendState` 等接口**实时修改管线状态**。而 Vulkan 的图形管线**近乎完全不可变**——任何着色器（Shader）更换、帧缓冲（Framebuffer）绑定或混合函数（Blend Function）调整，均需**重新创建完整的管线对象**。

这种设计虽迫使开发者预创建渲染所需的所有**管线状态组合**（如不同着色器+混合模式），但也因所有操作均可提前预定义，使得驱动层能够针对每个管线配置进行**深度优化**，最终获得比传统 API 更高效的运行时性能。

#### 3.2 Shader Modules

与早期API不同，Vulkan的着色器代码需以**字节码格式**而非GLSL或HLSL等人类可读语法编写。这种字节码称为**SPIR-V**（Standard Portable Intermediate Representation），专为Vulkan与OpenCL（同为Khronos标准）设计。尽管SPIR-V支持图形与计算着色器，本教程将聚焦图形管线的应用。

##### Vertex Shader

逐顶点处理输入数据，接收顶点属性（如世界空间坐标、颜色、法线向量、纹理坐标等）作为输入。其核心输出包含：

1. **裁剪空间坐标（Clip Coordinates）**：顶点在裁剪坐标系下的最终位置（需经过后续透视除法转为NDC）
2. **传递属性（Varying Attributes）**：如颜色、纹理坐标等需传递给片元着色器的数据

光栅化阶段（Rasterizer）会对这些传递属性在片元（Fragment）之间进行**线性插值**，从而实现跨图元表面的平滑渐变效果（如颜色过渡、纹理坐标插值）。

**裁剪坐标（Clip Coordinate）** 是顶点着色器输出的四维向量，随后通过**透视除法**（即所有分量除以向量的第四个分量 `w`）转换为**归一化设备坐标（Normalized Device Coordinates, NDC）**。

![](normalized_device_coordinates.svg)

特别需要注意的是：

- **Y轴方向**：Vulkan的NDC坐标系中，**Y轴方向向下**（与OpenGL的Y轴向上相反），需在顶点处理阶段调整坐标或通过视口变换修正。
- **Z轴范围**：采用与Direct3D一致的 **[0, 1]** 标准化范围（OpenGL为[-1, 1]），对应深度缓冲值的存储方式。

对于我们的第一个三角形来说，我们不会采用任何变换，我们直接指定三个顶点的NDC坐标，如下图所示：

![](triangle_coordinates.svg)

通常来说，坐标需要存储到顶点缓存中，但我们目前还没有对应的知识储备，所以我们不妨直接将顶点坐标写在vertex shader中：

```glsl
#version 450

vec2 positions[3] = vec2[]
(
    vec2(0.0, -0.5),
    vec2(0.5, 0.5),
    vec2(-0.5, 0.5)
);

void main()
{
    gl_Position = vec4(positions[gl_VertexIndex], 0.0, 1.0);
}
```

顶点着色器中的 `main` 函数会**逐顶点调用**。内置变量 `gl_VertexIndex` 表示当前顶点的索引值，其作用为：

- **索引来源**：通常对应顶点缓冲（Vertex Buffer）中的索引；
- **本示例特殊性**：直接访问着色器内**预定义的常量顶点数组**（硬编码数据）。

在具体实现中：

1. 通过 `gl_VertexIndex` 从常量数组中获取顶点 `x` 和 `y` 坐标；
2. 将 `z` 分量固定为 `0.0`、`w` 分量固定为 `1.0`，构造四维裁剪坐标；
3. 最终坐标写入内置变量 `gl_Position`，作为顶点在裁剪空间中的位置输出。

##### Fragment Shader

[略]

#### 3.3 Fixed Functions

##### Dynamic State

尽管**大部分管线状态需预先固化到管线对象**，仍有部分状态支持**运行时动态调整**而无需重建管线。此类动态状态包括视口尺寸（Viewport）、线宽（Line Width）及混合常量（Blend Constants）等。要启用动态状态功能，需通过配置 `VkPipelineDynamicStateCreateInfo` 结构体实现，具体步骤如下：

```c++
std::vector<VkDynamicState> dynamicStates = 
{
    VK_DYNAMIC_STATE_VIEWPORT,
    VK_DYNAMIC_STATE_SCISSOR
};

VkPipelineDynamicStateCreateInfo dynamicState{};
dynamicState.sType = VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO;
dynamicState.dynamicStateCount = static_cast<uint32_t>(dynamicStates.size());
dynamicState.pDynamicStates = dynamicStates.data();
```

启用动态状态后，管线将**忽略相关状态的固化配置**，转而在绘制时**强制要求显式设置这些状态值**。这种机制显著提升了管线配置的灵活性，尤其适用于以下场景：

- **视口参数（Viewport）**：需在命令缓冲中通过 `vkCmdSetViewport` 动态设置
- **裁剪区域（Scissor）**：通过 `vkCmdSetScissor` 实时更新
- **其他动态状态**：如线宽 (`vkCmdSetLineWidth`)、混合常量 (`vkCmdSetBlendConstants`) 等

相较于将这些状态**固化（Baked-in）**到管线对象中，动态状态机制避免了因参数变化导致的频繁管线重建，尤其在需要运行时动态调整（如响应窗口尺寸变化）时大幅提升性能。

##### Vertex Input

`VkPipelineVertexInputStateCreateInfo`结构体描述传递给顶点着色器的顶点数据格式，主要通过以下两方面定义：

- **绑定描述**：数据元素之间的内存步距，以及数据是按顶点还是按实例划分（参见几何实例化）
- **属性描述**：指定顶点着色器输入属性的数据类型、所属的绑定关系以及在绑定数据中的偏移位置

在三角形的例子中，我们直接将顶点数据写到了vertex shader中，所以目前我们直接将对应的字段指定为空即可：

```c++
VkPipelineVertexInputStateCreateInfo vertexInputInfo{};
vertexInputInfo.sType = VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO;
vertexInputInfo.vertexBindingDescriptionCount = 0;
vertexInputInfo.pVertexBindingDescriptions = nullptr; // Optional
vertexInputInfo.vertexAttributeDescriptionCount = 0;
vertexInputInfo.pVertexAttributeDescriptions = nullptr; // Optional
```

##### Input Assembly

`VkPipelineInputAssemblyStateCreateInfo` 结构体定义两个关键参数：

- **图元拓扑类型**：决定如何将顶点组装成几何图形
- **图元重启开关**：是否允许在绘制时使用特殊索引重启图元

其中`topology`成员支持以下拓扑类型：

- `VK_PRIMITIVE_TOPOLOGY_POINT_LIST`：每个顶点生成独立点
- `VK_PRIMITIVE_TOPOLOGY_LINE_LIST`：每两个顶点生成独立线段（顶点不共享）
- `VK_PRIMITIVE_TOPOLOGY_LINE_STRIP`：相邻线段共享顶点（顶点n+1作为第n条线的终点和第n+1条线的起点）
- `VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST`：每三个顶点生成独立三角形（顶点不共享）
- `VK_PRIMITIVE_TOPOLOGY_TRIANGLE_STRIP`：三角形带模式（后两个顶点复用为下一三角形的前两个顶点）

顶点数据通常按照索引顺序从顶点缓冲区加载，但使用元素缓冲区可自定义索引数据。这种机制允许实现顶点复用等优化操作。

在我们三角形的例子中，该结构体的配置如下：

```c++
VkPipelineInputAssemblyStateCreateInfo inputAssembly{};
inputAssembly.sType = VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO;
inputAssembly.topology = VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST;
inputAssembly.primitiveRestartEnable = VK_FALSE;
```

##### Viewports and Scissors

[略]

##### Rasterizer

光栅化阶段将顶点着色器输出的几何图形转换为片段，交由片段着色器处理。该阶段还负责执行深度测试、面剔除和裁剪测试，并可通过配置实现全多边形填充或仅绘制边线（线框渲染模式）。所有配置参数通过 `VkPipelineRasterizationStateCreateInfo` 结构体设置：

```c++
VkPipelineRasterizationStateCreateInfo rasterizer{};
rasterizer.sType = VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO;
rasterizer.depthClampEnable = VK_FALSE;
```

当`depthClampEnable`设为`VK_TRUE`时，超出近/远平面的片段将被钳制（clamped）到对应平面，而非直接丢弃。这在阴影贴图等特殊场景中非常有用。启用此功能需开启对应GPU功能特性。

```c++
rasterizer.rasterizerDiscardEnable = VK_FALSE;
```

设置为`VK_TRUE`，则表示几何体不会通过光栅化阶段，基本上会关闭掉framebuffer的输出。

```c++
rasterizer.polygonMode = VK_POLYGON_MODE_FILL;
```

`polygonMode`指定了几何体中的片段将如何填充，可选项有：

- `VK_POLYGON_MODE_FILL`
- `VK_POLYGON_MODE_LINE`
- `VK_POLYGON_MODE_POINT`

```c++
rasterizer.cullMode = VK_CULL_MODE_BACK_BIT;
rasterizer.frontFace = VK_FRONT_FACE_CLOCKWISE;
```

这两项不用多说

```c++
rasterizer.depthBiasEnable = VK_FALSE;
rasterizer.depthBiasConstantFactor = 0.0f; // Optional
rasterizer.depthBiasClamp = 0.0f; // Optional
rasterizer.depthBiasSlopeFactor = 0.0f; // Optional
```

这些成员通常与阴影绘制相关，目前暂时忽略即可。

##### Multisampling

`VkPipelineMultisampleStateCreateInfo` 结构体用于配置多重采样抗锯齿（MSAA）。其核心机制是通过合并映射到同一像素的多个多边形的片段着色器计算结果来实现抗锯齿，尤其针对几何边缘的锯齿现象。由于当单个多边形映射到像素时无需多次执行片段着色器，其性能开销远低于高分辨率渲染后降采样的方案。启用此功能需GPU支持对应硬件特性。

##### Depth and Stencil Testing

若使用深度和/或模板缓冲，需通过 `VkPipelineDepthStencilStateCreateInfo` 结构体配置深度与模板测试。当前阶段未使用此类缓冲，可直接传递 `nullptr` 代替结构体指针。具体配置方法将在深度测试章节详细说明。

##### Color Blending

片段着色器输出颜色后，需将其与帧缓冲中的现存颜色进行混合操作。颜色混合主要包含两种实现方式：

- **颜色混合**：通过混合方程计算新旧颜色的加权组合
- **位操作混合**：使用按位运算（如AND/OR/XOR）直接组合颜色值

颜色混合配置涉及两种关键结构体：

1. **`VkPipelineColorBlendAttachmentState`**：定义单个帧缓冲附件的混合参数（如颜色混合方程、通道掩码等）
2. **`VkPipelineColorBlendStateCreateInfo`**：控制全局混合设置（如逻辑操作开关、混合常量等）

当前渲染管线仅使用单个颜色附件，因此只需配置一个`VkPipelineColorBlendAttachmentState`实例。

```c++
VkPipelineColorBlendAttachmentState colorBlendAttachment{};
colorBlendAttachment.colorWriteMask = VK_COLOR_COMPONENT_R_BIT | VK_COLOR_COMPONENT_G_BIT | VK_COLOR_COMPONENT_B_BIT | VK_COLOR_COMPONENT_A_BIT;
colorBlendAttachment.blendEnable = VK_FALSE;
colorBlendAttachment.srcColorBlendFactor = VK_BLEND_FACTOR_ONE; // Optional
colorBlendAttachment.dstColorBlendFactor = VK_BLEND_FACTOR_ZERO; // Optional
colorBlendAttachment.colorBlendOp = VK_BLEND_OP_ADD; // Optional
colorBlendAttachment.srcAlphaBlendFactor = VK_BLEND_FACTOR_ONE; // Optional
colorBlendAttachment.dstAlphaBlendFactor = VK_BLEND_FACTOR_ZERO; // Optional
colorBlendAttachment.alphaBlendOp = VK_BLEND_OP_ADD; // Optional
```

这个逐framebuffer的结构体允许我们配置第一种混合方式。通过下面的伪代码，我们可以了解到该方法的混合工作原理：

```c++
if (blendEnable) 
{
    finalColor.rgb = (srcColorBlendFactor * newColor.rgb) <colorBlendOp> (dstColorBlendFactor * oldColor.rgb);
    finalColor.a = (srcAlphaBlendFactor * newColor.a) <alphaBlendOp> (dstAlphaBlendFactor * oldColor.a);
} 
else 
{
    finalColor = newColor;
}

finalColor = finalColor & colorWriteMask;
```

颜色混合最常见的例子是实现Alpha混合，即：

```c++
finalColor.rgb = newAlpha * newColor + (1 - newAlpha) * oldColor;
finalColor.a = newAlpha.a;
```

而对应的`VkPipelineColorBlendAttachmentState`配置为：

```c++
colorBlendAttachment.blendEnable = VK_TRUE;
colorBlendAttachment.srcColorBlendFactor = VK_BLEND_FACTOR_SRC_ALPHA;
colorBlendAttachment.dstColorBlendFactor = VK_BLEND_FACTOR_ONE_MINUS_SRC_ALPHA;
colorBlendAttachment.colorBlendOp = VK_BLEND_OP_ADD;
colorBlendAttachment.srcAlphaBlendFactor = VK_BLEND_FACTOR_ONE;
colorBlendAttachment.dstAlphaBlendFactor = VK_BLEND_FACTOR_ZERO;
colorBlendAttachment.alphaBlendOp = VK_BLEND_OP_ADD;
```

`VkPipelineColorBlendStateCreateInfo`结构体关联所有帧缓冲的结构体数组，并允许设置混合常量，这些常量可在前述计算中作为混合因子使用：

```c++
VkPipelineColorBlendStateCreateInfo colorBlending{};
colorBlending.sType = VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO;
colorBlending.logicOpEnable = VK_FALSE;
colorBlending.logicOp = VK_LOGIC_OP_COPY; // Optional
colorBlending.attachmentCount = 1;
colorBlending.pAttachments = &colorBlendAttachment;
colorBlending.blendConstants[0] = 0.0f; // Optional
colorBlending.blendConstants[1] = 0.0f; // Optional
colorBlending.blendConstants[2] = 0.0f; // Optional
colorBlending.blendConstants[3] = 0.0f; // Optional
```

如果想要启用第二种混合模式，则需要将`logicOpEnable`设置为`VK_TRUE`。

##### Pipeline Layout

着色器可使用统一值(uniform)，这类全局变量类似于动态状态，可在绘制时修改以改变着色器行为，而无需重建管线。它们常用于向顶点着色器传递变换矩阵，或在片段着色器中创建纹理采样器。统一值需在管线创建时通过`VkPipelineLayout`对象进行声明。

```c++
VkPipelineLayoutCreateInfo pipelineLayoutInfo{};
pipelineLayoutInfo.sType = VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO;
pipelineLayoutInfo.setLayoutCount = 0; // Optional
pipelineLayoutInfo.pSetLayouts = nullptr; // Optional
pipelineLayoutInfo.pushConstantRangeCount = 0; // Optional
pipelineLayoutInfo.pPushConstantRanges = nullptr; // Optional

if (vkCreatePipelineLayout(device, &pipelineLayoutInfo, nullptr, &pipelineLayout) != VK_SUCCESS) {
    throw std::runtime_error("failed to create pipeline layout!");
}
```

从代码中，我们可以看到该结构体还指定了push constants，这是另一种将动态变量传递给shader的方式。

现在，我们已经了解了可编程阶段与固定功能阶段，但想要创建一个图形管线，我们还需要最后一个对象，Render Pass。

#### 3.4 Render Passes

在最终完成图形管线创建前，需向Vulkan声明渲染过程中使用的帧缓冲附件参数。必须明确以下配置：

1. 颜色附件和深度附件的数量
2. 每个附件使用的多重采样等级
3. 渲染操作期间附件内容的管理方式（如加载/存储操作）

这些配置参数统一封装在渲染通道（render pass）对象中，该对象通过`VkRenderPass`进行管理。

##### Attachment Description

In our case we'll have just a single color buffer attachment represented by one of the images from the swap chain.

在我们的三角形案例中，我们仅使用单个颜色附件，该附件直接关联交换链中的呈现图像：

```c++
VkAttachmentDescription colorAttachment{};
colorAttachment.format = swapChainImageFormat;
colorAttachment.samples = VK_SAMPLE_COUNT_1_BIT;
colorAttachment.loadOp = VK_ATTACHMENT_LOAD_OP_CLEAR;
colorAttachment.storeOp = VK_ATTACHMENT_STORE_OP_STORE;
```

`format`应该与交换链图像的格式相匹配。`loadOp` 和 `storeOp` 分别控制渲染前附件数据的加载行为与渲染后附件数据的存储行为。`loadOp` 支持以下操作模式：

- **`VK_ATTACHMENT_LOAD_OP_LOAD`**：保留附件中现有内容
- **`VK_ATTACHMENT_LOAD_OP_CLEAR`**：在渲染开始时使用指定常量值清空附件
- **`VK_ATTACHMENT_LOAD_OP_DONT_CARE`**：不保留原有内容（渲染前附件内容视为未定义）

`storeOp` 的可用选项如下：

- **`VK_ATTACHMENT_STORE_OP_STORE`**：渲染结果将被存储至内存，可供后续读取
- **`VK_ATTACHMENT_STORE_OP_DONT_CARE`**：渲染操作后帧缓冲内容视为未定义

```c++
colorAttachment.stencilLoadOp = VK_ATTACHMENT_LOAD_OP_DONT_CARE;
colorAttachment.stencilStoreOp = VK_ATTACHMENT_STORE_OP_DONT_CARE;
```

`loadOp`与`storeOp`应用与颜色与深度数据，而`stencilLoadOp`与`stencilStoreOp`则应用于模板值

```c++
colorAttachment.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED;
colorAttachment.finalLayout = VK_IMAGE_LAYOUT_PRESENT_SRC_KHR;
```

在Vulkan中，纹理和帧缓冲通过`VkImage`对象表示，**这些对象具有特定像素格式，但其内存布局会根据图像用途动态调整**。常见图像布局包括：

- **`VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL`**：专为颜色附件优化的布局
- **`VK_IMAGE_LAYOUT_PRESENT_SRC_KHR`**：适用于交换链呈现的最终布局
- **`VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL`**：内存拷贝操作的目标布局

关于图像布局转换的详细说明将在纹理章节展开，当前阶段需明确：**图像必须通过布局转换进入与后续操作匹配的最佳状态**。

`initialLayout` 定义渲染通道开始前图像的初始布局，`finalLayout` 指定渲染通道结束后自动切换的目标布局。当 `initialLayout` 设置为 `VK_IMAGE_LAYOUT_UNDEFINED` 时，表示：

1. 不关心图像原有布局状态
2. 图像原有内容不保证保留（符合当前清空操作的预期）
   渲染完成后，图像需切换至交换链呈现所需的布局，因此 `finalLayout` 应设为 `VK_IMAGE_LAYOUT_PRESENT_SRC_KHR`。

##### Subpasses and Attachment References

单个渲染通道可包含多个子通道。**子通道是依赖前一子通道帧缓冲内容的连续渲染操作**，典型应用场景包括按序执行的后处理效果链。将这些操作整合到单一渲染通道中，可使**Vulkan优化执行顺序并减少内存带宽占用，从而提升性能**。但针对当前基础三角形渲染场景，仅需使用单个子通道即可。

每个子通道通过`VkAttachmentReference`结构体引用一个或多个由`VkAttachmentDescription`定义的附件，具体形式如下：

```c++
VkAttachmentReference colorAttachmentRef{};
colorAttachmentRef.attachment = 0;
colorAttachmentRef.layout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL;
```

`attachment`参数通过索引指定所引用的附件描述（对应`pAttachments`数组中的元素）。当前示例中附件描述数组仅包含单个元素，故使用索引`0`。`layout`参数定义子通道中该附件的目标布局，Vulkan**将在子通道启动时自动将附件转换至此布局**。当附件作为颜色缓冲区使用时，`VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL`布局可提供最佳性能表现。

子通道本身则通过`VkSubpassDescription`结构体描述：

```c++
VkSubpassDescription subpass{};
subpass.pipelineBindPoint = VK_PIPELINE_BIND_POINT_GRAPHICS;
```

Vulkan在未来有可能支持计算子通道，所以我们需要显式地表明该子通道是一个图形子通道。

接下来，我们指定颜色附件的引用：

```c++
subpass.colorAttachmentCount = 1;
subpass.pColorAttachments = &colorAttachmentRef;
```

片段着色器可通过`layout(location = 0) out vec4 outColor`布局限定符直接访问附件数组索引对应的颜色附件（如索引0对应第一个颜色附件）。

子通道还可引用以下功能型附件：

- **输入附件**：供着色器读取的附件（通过`input`接口块访问）
- **解析附件**：用于多重采样颜色附件的降采样解析（MSAA Resolve）
- **深度模板附件**：包含深度测试和模板测试数据的专用附件
- **保留附件**：子通道不直接使用但需保持数据完整性的附件

##### Render Pass

在完成附件描述及关联子通道配置后，即可创建渲染通道对象

```c++
VkRenderPassCreateInfo renderPassInfo{};
renderPassInfo.sType = VK_STRUCTURE_TYPE_RENDER_PASS_CREATE_INFO;
renderPassInfo.attachmentCount = 1;
renderPassInfo.pAttachments = &colorAttachment;
renderPassInfo.subpassCount = 1;
renderPassInfo.pSubpasses = &subpass;

if (vkCreateRenderPass(device, &renderPassInfo, nullptr, &renderPass) != VK_SUCCESS) 
{
    throw std::runtime_error("failed to create render pass!");
}
```

#### 3.5 Conclusion

通过整合前文创建的所有组件，现在可以构建完整的图形管线。以下是我们目前已构建的核心组件类别：

1. **着色器阶段**：定义可编程管线阶段（顶点/片段着色器）的着色器模块
2. **固定功能管线状态**：配置输入装配、光栅化、视口、颜色混合等固定功能阶段的参数集合
3. **管线布局**：管理着色器引用的统一值(uniform)和推送常量(push constant)，支持绘制时动态更新
4. **渲染通道**：声明管线各阶段引用的帧缓冲附件及其使用方式

```c++
VkGraphicsPipelineCreateInfo pipelineInfo{};
pipelineInfo.sType = VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO;
pipelineInfo.stageCount = 2;
pipelineInfo.pStages = shaderStages;
pipelineInfo.pVertexInputState = &vertexInputInfo;
pipelineInfo.pInputAssemblyState = &inputAssembly;
pipelineInfo.pViewportState = &viewportState;
pipelineInfo.pRasterizationState = &rasterizer;
pipelineInfo.pMultisampleState = &multisampling;
pipelineInfo.pDepthStencilState = nullptr; // Optional
pipelineInfo.pColorBlendState = &colorBlending;
pipelineInfo.pDynamicState = &dynamicState;
pipelineInfo.layout = pipelineLayout;
pipelineInfo.renderPass = renderPass;
pipelineInfo.subpass = 0;
```

`VkGraphicsPipelineCreateInfo`结构体还有两个额外的参数：

```c++
pipelineInfo.basePipelineHandle = VK_NULL_HANDLE; // Optional
pipelineInfo.basePipelineIndex = -1; // Optional
```

`basePipelineHandle`与`basePipelineIndex`参数支持管线派生机制，**允许基于现有管线创建具有功能继承关系的新管线**。这种机制在以下场景具有性能优势：

1. **创建优化**：派生管线复用父管线已有状态，降低创建开销
2. **切换优化**：同源派生管线间切换效率更高

创建管线：

```c++
if (vkCreateGraphicsPipelines(device, VK_NULL_HANDLE, 1, &pipelineInfo, nullptr, &graphicsPipeline) != VK_SUCCESS) {
    throw std::runtime_error("failed to create graphics pipeline!");
}
```

`vkCreateGraphicsPipelines` 函数的设计特点：

1. **批量创建能力**：支持通过单个API调用，基于多个`VkGraphicsPipelineCreateInfo`结构体创建多个`VkPipeline`对象
2. **管线缓存参数**：第二个参数为`VkPipelineCache`对象（当前示例使用`VK_NULL_HANDLE`表示无缓存）

管线缓存的核心优势：

- **跨调用复用**：缓存管线创建过程中的编译/链结数据，提升后续管线创建速度
- **持久化存储**：可序列化保存至文件系统，在应用程序重启后重复使用
  （注：管线缓存的详细机制将在管线缓存专章解析）

---

### 4 Drawing

#### 4.1 Framebuffers

在之前的章节中，我们详细讨论了帧缓冲，并配置了渲染通道使其预期使用与交换链图像格式相同的单个帧缓冲，但尚未实际创建任何帧缓冲对象。

渲染通道创建时指定的附件需通过`VkFramebuffer`（帧缓冲）对象进行绑定。该对象通过`VkImageView`（图像视图）引用所有附件。当前案例中仅涉及单个颜色附件，但实际使用的附件图像取决于交换链在呈现时返回的具体图像。这意味着必须执行以下操作：

1. **为交换链中的每个图像创建对应的帧缓冲对象**
2. **在绘制时选择与当前交换链图像匹配的帧缓冲**

```c++
void createFramebuffers() 
{
    swapChainFramebuffers.resize(swapChainImageViews.size());

    for (size_t i = 0; i < swapChainImageViews.size(); i++) 
    {
        VkImageView attachments[] = {
            swapChainImageViews[i]
        };

        VkFramebufferCreateInfo framebufferInfo{};
        framebufferInfo.sType = VK_STRUCTURE_TYPE_FRAMEBUFFER_CREATE_INFO;
        framebufferInfo.renderPass = renderPass;
        framebufferInfo.attachmentCount = 1;
        framebufferInfo.pAttachments = attachments;
        framebufferInfo.width = swapChainExtent.width;
        framebufferInfo.height = swapChainExtent.height;
        framebufferInfo.layers = 1;

        if (vkCreateFramebuffer(device, &framebufferInfo, nullptr, &swapChainFramebuffers[i]) != VK_SUCCESS) {
            throw std::runtime_error("failed to create framebuffer!");
        }
    }
}
```

帧缓冲的创建流程较为直观：首先必须指定与之兼容的渲染通道。**帧缓冲仅可在兼容的渲染通道中使用，兼容性要求两者使用附件的数量和类型完全一致**。

#### 4.2 Command Buffers

Vulkan中的命令（如绘制操作和内存传输）并非通过函数调用直接执行，而是需要将操作指令预先记录到命令缓冲区对象中。这种机制的优势在于：

1. **批量提交优化**：所有指令集中提交，Vulkan可进行整体优化处理
2. **多线程支持**：命令录制工作可分配到多个线程并行执行
3. **执行预规划**：提前构建完整的指令序列，降低运行时开销

##### Command Pools

在创建命令缓冲区前，需先创建命令池（command pool）。命令池负责管理存储命令缓冲区的内存资源，且命令缓冲区必须从命令池中进行分配。

命令池的创建仅仅需要两个参数：

```c++
QueueFamilyIndices queueFamilyIndices = findQueueFamilies(physicalDevice);

VkCommandPoolCreateInfo poolInfo{};
poolInfo.sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO;
poolInfo.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;
poolInfo.queueFamilyIndex = queueFamilyIndices.graphicsFamily.value();
```

命令池支持以下两种创建标志：

- **`VK_COMMAND_POOL_CREATE_TRANSIENT_BIT`**：指示命令缓冲区会频繁重置并记录新指令（可能触发更激进的内存回收策略）
- **`VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT`**：允许单独重置命令缓冲区；未设置此标志时，必须通过重置命令池批量回收所有关联的命令缓冲区

由于需要每帧重新录制命令缓冲区，我们必须确保它们支持单次重置，因此命令池必须启用`VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT`标志。

命令缓冲区通过提交到设备队列（如先前获取的图形队列和呈现队列）来执行，且存在以下约束：

1. **队列家族专属性**：命令池生成的命令缓冲区只能提交到创建时指定的队列家族（当前选择图形队列家族）
2. **操作类型匹配**：图形队列家族专门处理绘制操作指令，与当前渲染场景需求完全契合

##### Command Buffer Allocation

现在我们可以开始分配命令缓冲了，具体来说，我们需要填充`VkCommandBufferAllocateInfo`结构体，用于指定命令池与缓冲区的分配数量：

```c++
VkCommandBufferAllocateInfo allocInfo{};
allocInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO;
allocInfo.commandPool = commandPool;
allocInfo.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
allocInfo.commandBufferCount = 1;

if (vkAllocateCommandBuffers(device, &allocInfo, &commandBuffer) != VK_SUCCESS) 
{
    throw std::runtime_error("failed to allocate command buffers!");
}
```

命令缓冲区的`level`参数定义其层级属性，支持以下两种模式：

- **主级命令缓冲区 (`VK_COMMAND_BUFFER_LEVEL_PRIMARY`)*：可直接提交至设备队列执行，但无法被其他命令缓冲区调用
- **次级命令缓冲区 (`VK_COMMAND_BUFFER_LEVEL_SECONDARY`)**：不可直接提交执行，但可通过主级命令缓冲区调用（需配合`vkCmdExecuteCommands`）

当前的三角形案例暂未使用次级命令缓冲区功能。**该功能的核心优势在于支持将通用渲染操作封装为次级命令缓冲区，实现跨主级缓冲区的指令复用，从而优化复杂场景的渲染效率**。

##### Command Buffer Recording

现在我们来构建一个用于将命令记录到命令缓冲区的函数：

```c++
void recordCommandBuffer(VkCommandBuffer commandBuffer, uint32_t imageIndex) 
{

}
```

我们总是通过调用`vkBeginCommandBuffer`来开始记录命令缓冲区，该函数需要传入一个简短的`VkCommandBufferBeginInfo`结构体参数，用于指定该命令缓冲区的具体使用细节。

```c++
VkCommandBufferBeginInfo beginInfo{};
beginInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO;
beginInfo.flags = 0; // Optional
beginInfo.pInheritanceInfo = nullptr; // Optional

if (vkBeginCommandBuffer(commandBuffer, &beginInfo) != VK_SUCCESS)
{
    throw std::runtime_error("failed to begin recording command buffer!");
}
```

`flags`参数指定了命令缓冲区的使用方式，可选值包括：

- `VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT`: 命令缓冲区在执行一次后立即重新录制
- `VK_COMMAND_BUFFER_USAGE_RENDER_PASS_CONTINUE_BIT`: 这是完全限定在单个渲染流程中的次级命令缓冲区
- `VK_COMMAND_BUFFER_USAGE_SIMULTANEOUS_USE_BIT`: 命令缓冲区在等待执行期间可被重复提交

这些标志目前我们暂时都不需要。

`pInheritanceInfo`参数仅适用于次级命令缓冲区，用于指定从调用的主命令缓冲区继承哪些状态。

如果命令缓冲区已被记录过，调用`vkBeginCommandBuffer`会隐式重置它。之后无法再向缓冲区追加命令。

##### Starting a Render Pass

绘制操作通过`vkCmdBeginRenderPass`开启渲染流程，该函数需要使用包含配置参数的`VkRenderPassBeginInfo`结构体进行设置：

```c++
VkRenderPassBeginInfo renderPassInfo{};
renderPassInfo.sType = VK_STRUCTURE_TYPE_RENDER_PASS_BEGIN_INFO;
renderPassInfo.renderPass = renderPass;
renderPassInfo.framebuffer = swapChainFramebuffers[imageIndex];
```

第一个参数是渲染流程本身和需要绑定的附件。我们为每个交换链图像都创建了framebuffer，并将其指定为颜色附件。因此需要绑定目标交换链图像对应的framebuffer。通过传入的`imageIndex`参数，我们可以为当前交换链图像选取正确的framebuffer。

```c++
renderPassInfo.renderArea.offset = {0, 0};
renderPassInfo.renderArea.extent = swapChainExtent;
```

接下来的两个参数定义渲染区域范围，该区域决定了着色器加载和存储操作的有效范围。此区域外的像素将具有未定义值。为获得最佳性能，渲染区域尺寸应与附件尺寸完全一致。

```c++
VkClearValue clearColor = {{{0.0f, 0.0f, 0.0f, 1.0f}}};
renderPassInfo.clearValueCount = 1;
renderPassInfo.pClearValues = &clearColor;
```

最后两个参数定义了用于`VK_ATTACHMENT_LOAD_OP_CLEAR`操作的清除值，该加载操作正是我们为颜色附件设置的配置。我们这里清除颜色定义为完全不透明的纯黑色。

```c++
vkCmdBeginRenderPass(commandBuffer, &renderPassInfo, VK_SUBPASS_CONTENTS_INLINE);
```

渲染流程现在可以启动。所有记录命令的函数均以`vkCmd`为前缀标识。

所有命令函数的第一个参数始终是用于记录命令的命令缓冲区。第二个参数指定了之前配置的渲染流程详细信息。**最后一个参数控制渲染流程内绘制命令的执行方式**，其可选值包括：

- `VK_SUBPASS_CONTENTS_INLINE`：渲染流程命令直接内嵌在主命令缓冲区，不执行次级命令缓冲区
- `VK_SUBPASS_CONTENTS_SECONDARY_COMMAND_BUFFERS`：渲染流程命令从次级命令缓冲区执行

由于我们不使用次级命令缓冲区，因此选择第一个选项。

##### Basic Drawing Commands

首先我们需要绑定图形管线：

```c++
vkCmdBindPipeline(commandBuffer, VK_PIPELINE_BIND_POINT_GRAPHICS, graphicsPipeline);
```

第二个参数指定管线绑定类型（图形或计算管线）。此时我们已告知Vulkan在图形管线中执行哪些操作，并指定了片段着色器要使用的帧缓冲附件。

在创建管线的过程中，我们将管线的视口和裁剪状态设置为动态类型。因此需要在发出绘制命令前，在命令缓冲区中显式设置这两个状态：

```c++
VkViewport viewport{};
viewport.x = 0.0f;
viewport.y = 0.0f;
viewport.width = static_cast<float>(swapChainExtent.width);
viewport.height = static_cast<float>(swapChainExtent.height);
viewport.minDepth = 0.0f;
viewport.maxDepth = 1.0f;
vkCmdSetViewport(commandBuffer, 0, 1, &viewport);

VkRect2D scissor{};
scissor.offset = {0, 0};
scissor.extent = swapChainExtent;
vkCmdSetScissor(commandBuffer, 0, 1, &scissor);
```

现在，我们可以发出三角形的绘制命令了：

```c++
vkCmdDraw(commandBuffer, 3, 1, 0, 0);
```

`vkCmdDraw`函数的参数结构如下(除命令缓冲区参数外)：

- `vertexCount`：顶点数量，本案例中虽无顶点缓冲区，但仍需绘制3个顶点
- `instanceCount`：实例化渲染计数，非实例化场景设为`1`
- `firstVertex`：顶点数据偏移量，决定`gl_VertexIndex`的最小值
- `firstInstance`：实例化偏移量，决定`gl_InstanceIndex`的最小值

##### Finishing up

现在Render Pass可以结束了：

```c++
vkCmdEndRenderPass(commandBuffer);
```

最后，我们还需要结束命令缓冲区的记录：

```c++
if (vkEndCommandBuffer(commandBuffer) != VK_SUCCESS) 
{
    throw std::runtime_error("failed to record command buffer!");
}
```

#### 4.3 Rendering and Presentation

在本小节中，我们将实现用于绘制与呈现三角形的函数，并在主循环中进行该函数的调用。

##### Outline of a Frame

从宏观层面看，Vulkan中渲染一帧包含以下标准步骤：

- 等待前一帧完成渲染
- 从交换链获取可用图像
- 记录将场景绘制到该图像的命令缓冲区
- 提交已记录的命令缓冲区
- 呈现交换链图像

虽然我们会在后续章节扩展绘制功能，但目前这就是渲染循环的核心流程。

##### Synchronization

Vulkan的核心设计理念是GPU上的执行同步必须显式声明。操作的执行顺序需要开发者通过同步原语来明确指定，这些原语会告知驱动程序我们期望的执行流程。**这意味着许多在GPU上启动工作的Vulkan API调用都是异步的——函数会在操作实际完成前就返回**。

本章涉及的GPU操作需要显式排序，例如：

- 从交换链获取图像
- 执行将内容绘制到该图像的命令
- 将图像呈现到屏幕后归还交换链

**这些操作虽然都是通过单个函数调用启动，但均以异步方式执行。函数调用会在操作实际完成前返回，且执行顺序也未定义**。由于每个操作都依赖于前一个操作的完成，因此我们必须通过同步机制来实现正确的执行顺序。

**Semaphores**

信号量用于协调队列操作的执行顺序。**队列操作指我们提交到队列的工作负载，这些负载可能封装在命令缓冲区中，也可能通过API函数直接提交（后续章节会具体说明）**。常见的队列类型包括图形队列和呈现队列。**信号量既能管理同一队列内部操作的时序关系，也能协调不同队列之间的操作依赖**。

Vulkan中存在两种信号量类型：二元信号量和时间线信号量。由于本系列博客仅涉及二元信号量的使用，故不讨论时间线信号量。后续所有提及的"信号量"均特指二元类型。

信号量存在两种状态：未触发或已触发。初始状态为未触发。我们通过在队列操作间共享信号量实现同步——将同一信号量同时作为某个操作的"触发信号"和另一操作的"等待信号"。例如对于信号量S和需顺序执行的队列操作A、B，我们告知Vulkan：操作A完成执行时将触发S，操作B开始执行前需等待S被触发。当操作A完成后，S进入已触发状态，此时操作B才能启动；操作B开始执行后，S会自动重置为未触发状态，从而实现循环使用。

上述过程可以通过伪代码表示：

```c++
VkCommandBuffer A, B = ... // record command buffers
VkSemaphore S = ... // create a semaphore

// enqueue A, signal S when done - starts executing immediately
vkQueueSubmit(work: A, signal: S, wait: None)

// enqueue B, wait on S to start
vkQueueSubmit(work: B, signal: None, wait: S)
```

请注意，在这段代码中，两次调用`vkQueueSubmit()`会立即返回——等待仅发生在GPU端。CPU会继续运行而不被阻塞。若要让CPU等待，我们需要另一种同步原语，接下来将详细说明。

**Fences**

栅栏的作用类似，都用于同步操作，但它是用于协调CPU端（即主机）的执行顺序。简而言之，若主机需要得知GPU何时完成某项任务，就需要使用栅栏。

与信号量类似，栅栏也处于两种状态：有信号或无信号。每当我们向队列提交任务时，**可以将栅栏关联到该任务上**。当任务完成后，栅栏会变为有信号状态。随后，我们可以让主机等待栅栏变为有信号状态，从而确保主机在任务完成后才会继续执行。

一个具体例子是截屏。假设我们已经在GPU上完成了必要的工作，现在需要将图像从GPU传输到主机（host），再将内存保存到文件。我们有一个执行传输任务的命令缓冲区A和栅栏F。将命令缓冲区A与栅栏F关联并提交后，立即让主机等待栅栏F变为有信号状态。这会使主机阻塞，直到命令缓冲区A执行完成。由于内存传输已完成，此时主机即可安全地将文件保存至硬盘。

上述过程的伪代码为：

```c++
VkCommandBuffer A = ... // record command buffer with the transfer
VkFence F = ... // create the fence

// enqueue A, start work immediately, signal F when done
vkQueueSubmit(work: A, fence: F)

vkWaitForFence(F) // blocks execution until A has finished executing

save_screenshot_to_disk() // can't run until the transfer has finished
```

与信号量不同，此示例确实会阻塞主机执行。这意味着主机在等待操作完成期间不会执行任何其他任务。在本案例中，我们必须确保传输完成才能将截图保存到硬盘。

通常来说，除非必要，应尽量避免阻塞主机。我们希望为GPU和主机分配有效任务，而等待栅栏信号并非有效工作。因此更推荐使用信号量或其他尚未介绍的同步原语来协调任务。

**栅栏必须手动重置回无信号状态。这是因为栅栏用于控制主机的执行，因此由主机决定何时重置栅栏**。这与信号量形成对比——信号量仅用于协调GPU端的任务顺序，无需主机介入。

总结而言，信号量用于指定GPU端操作的执行顺序，而栅栏用于保持CPU与GPU之间的同步。

**What to Choose?**

在我们的三角形渲染案例中，存在两处需要同步的场景：

1. **交换链操作**：使用信号量实现同步，因为这些操作完全发生在GPU端。这样能避免不必要的主机等待，保持CPU与GPU的并行执行效率。
2. **等待前一帧完成**：此处需使用栅栏，因为我们必须让主机等待GPU完成前一帧渲染。这种同步机制确保不会同时提交多帧数据——由于每帧都需要重新录制命令缓冲区（command buffer），若GPU仍在执行当前帧时覆盖缓冲区内容，会导致资源冲突问题。

##### Creating the Synchronization Objects

我们需要三个同步原语：

- 一个信号量用于通知交换链图像已获取并准备好渲染
- 一个信号量用于通知渲染完成以便进行呈现
- 一个栅栏用于确保同一时间仅渲染一帧

信号量的创建需要填充`VkSemephoreCreateInfo`结构体，但是在当前API版本中，并没有实际有意义的参数：

```c++
VkSemaphoreCreateInfo semaphoreInfo{};
semaphoreInfo.sType = VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO;
```

在后续的版本中，有可能会添加`flags`或`pNext`等参数。

类似的，栅栏的创建需要填充`VkFenceCreateInfo` 结构体：

```c++
VkFenceCreateInfo fenceInfo{};
fenceInfo.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
```

最后完成创建：

```c++
vkCreateSemaphore(device, &semaphoreInfo, nullptr, &imageAvailableSemaphore);
vkCreateSemaphore(device, &semaphoreInfo, nullptr, &renderFinishedSemaphore);
vkCreateFence(device, &fenceInfo, nullptr, &inFlightFence) != VK_SUCCESS);
```

##### Waiting for the Previous Frame

在每一帧开始时，需等待前一帧完成执行，以确保命令缓冲区和信号量可被安全复用。为此需调用`vkWaitForFences`：

```c++
void drawFrame()
{
    vkWaitForFences(device, 1, &inFlightFence, VK_TRUE, UINT64_MAX);
}
```

`vkWaitForFences`函数接收一个栅栏数组，并在主机端等待其中任意一个或全部栅栏变为有信号状态后返回。此处传入的`VK_TRUE`表示需等待所有栅栏变为有信号状态（但若仅传入单个栅栏，此参数实际无影响）。该函数还包含超时参数，此处设为64位无符号整数最大值`UINT64_MAX`，以彻底禁用超时机制。

当等待结束后，我们需要手动重置栅栏：

```c++
vkResetFences(device, 1, &inFlightFence);
```

在继续之前，我们的设计存在一个小问题：首次调用`drawFrame()`时，会立即等待`inFlightFence`变为有信号状态。然而，该栅栏仅在帧渲染完成后才会触发，而第一帧之前并无任何帧能触发此栅栏，导致`vkWaitForFences()`无限期阻塞主机，等待永远不会发生的事件。

针对此问题，Vulkan API提供了一个巧妙的解决方案：在创建栅栏时直接将其初始化为有信号状态。为此，需在`VkFenceCreateInfo`结构体的`flags`成员中指定`VK_FENCE_CREATE_SIGNALED_BIT`标志。这样，首次调用`vkWaitForFences()`时会立即返回，因为栅栏已处于有信号状态：

```c++
VkFenceCreateInfo fenceInfo{};
fenceInfo.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
fenceInfo.flags = VK_FENCE_CREATE_SIGNALED_BIT;
```

