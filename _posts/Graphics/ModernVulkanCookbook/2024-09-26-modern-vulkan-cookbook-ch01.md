---
title: Vulkan Core Concepts
date: 2024-09-26 22:41 +0800
categories: [Graphics, Modern Vulkan Cookbook]
media_subpath: /assets/img/Graphics/LearnVulkan/
math: false
---

### Learning about Vulkan objects

在本小节，我们将会了解什么是Vulkan的对象，以及Vulkan对象之间是如何相互联系的

#### Getting ready

Vulkan中的对象是一些不透明的句柄，并且对象类型都以`Vk`为前缀命名，例如`VkInstance`，`VkDevice`。有些对象需要其他对象的实例来创建或分配。**这种依赖关系为对象的创建建立了一种隐式的逻辑顺序。**比方说，只有`VkInstance`对象创建后，我们才能创建`VkPhysicalDevice`对象。

#### How to do it...

![](B18491_01_01.png)

上图总结了Vulkan中最重要的一些对象，其中：

1. **实线箭头表示显式的依赖关系**：一个对象需要对其用实线箭头指向的对象进行引用。例如，`VkDevice`需要`VkPhysicalDevice`的索引，而`VkBufferView`需要`VkBuffer`和`VkDevice`的索引。
2. **虚线箭头表示隐式的依赖关系：**以`VkQueue`为例，一个`VkQueue`需要`VkDevice`的索引，但是并不显式地需要`VkPhysicalDevice`对象的索引。之所以说它们的关系是隐式的，是因为`VkQueue`只是一个队列族中的队列索引值，而队列族可以直接从`VkPhysicalDevice`枚举获得
3. **对象可以从另一个对象中分配得到**：如`VkCommandBuffer`可以从`VkCommandPool`中分配得到

我们的系列博客会大致按照图表中从上到下的顺序，依次创建所有对象，并构建一个精简的Vulkan应用程序。

---

### Using Volk to load Vulkan functions and extensions

Volk是一个开源库，提供了跨平台载入Vulkan函数的功能。

#### Getting ready

[zeux/volk: Meta loader for Vulkan API (github.com)](https://github.com/zeux/volk)

Volk提供了CMake构建选项，我们只需要clone到项目的thirdparty目录中，并在构建时包含Volk即可。

#### How to do it...

Volk会自动载入Vulkan的函数指针，同时也会自动完成对Vulkan库的连接，所以我们无需再考虑这个步骤。

要使用Volk，我们需要遵循下面三个步骤：

1. 在应用程序初始化时，调用`volkInitialize()`，然后再调用其他任何Vulkan函数。如果该函数返回失败，则表示系统中没有安装Vulkan loader。
2. 创建好`VkInstance`后，调用`volkLoadInstance()`，它会用`vkGetInstanceProcAddr`获取的函数替换全局函数指针
3. 创建好VkDevice后，调用`volkLoadDevice()`，作用同上

---

### Using Vulkan extensions correctly

Vulkan高度依赖于扩展，也就是对Vulkan核心API功能和类型的补充。如下图所示：
![](B18491_01_02.jpg)

#### Getting ready

扩展可以分为两类，一种是实例级别的扩展，一种是设备级别的扩展。在使用一个扩展之前，我们需要在编译时确定该扩展是可用的。启用扩展时，需要我们提供对应的扩展名。

#### How to do it...

我们可以使用下面这样的代码来判断一个扩展是否可用

```c++
bool isEnabledForDevice(VkDevice device,
                        const std::string &extName) {
    // std::unordered_map<std::string> deviceExtensions;
    return deviceExtensions.contains(extName);
}
VkDevice device;  // Valid Vulkan Device
#if defined(VK_KHR_win32_surface)
// VK_KHR_WIN32_SURFACE_EXTENSION_NAME is defined as the string
// "VK_KHR_win32_surface"
if (isEnabledForDevice(device, VK_KHR_WIN32_SURFACE_EXTENSION_NAME)) {
    // VkWin32SurfaceCreateInfoKHR struct is available, as well as the
    // vkCreateWin32SurfaceKHR() function
    VkWin32SurfaceCreateInfoKHR surfaceInfo;
}
#endif
```

---

### Using the Validation Layer for error checking

我们来了解一下Vulkan中的layer是什么，以及layer中的消息是如何呈现出来的

#### Getting ready

Layer由Vulkan SDK提供，无需另外的配置工作

#### How to do it...

Layer是可以被插入到调用链中的Vulkan函数实现，能够拦截API的entry point，它有三个作用：

- 检测报错
- 评估性能
- 检测潜在的优化

Vulkan SDK提供了一些满足**Plug and Play**特性的layer，所以，我们只需要在Vulkan实例中启用需要的layer即可，layer在运行时调用Vulkan函数是会自行执行工作。

最重要的一个layer就是Validation Layer，它会确认所有的Vulkan函数调用以及对应的参数。此外，validation layer还会维护一个内部状态，用于确保我们的应用程序不会错过同步步骤，或者使用错误的图像layout。

---

### Enumerating available instance layers

想要启用实例级别的layer，我们只需要在创建实例时提供const char*格式的layer明明即可。但是，在启用之前，我们还是需要确保哪些layer是可用的。

我们来了解一下如何枚举出可用的实例级别的layer，以及如何将它们转换为字符串。

#### How to do it...

1. 首先，我们调用函数`vkEnumerateInstanceLayerProperties`获取可用的layer数量，然后根据该数量创建一个`VkLayerProperties`数组，最后再次调用`vkEnumerateInstanceLayerProperties`，获取可用的级别并填充到`VkLayerProperties`数组中。

   ```c++
   uint32_t instanceLayerCount {0};
   VK_CHECK(vkEnumerateInstanceLayerProperties(&instanceLayerCount, nullptr));
   std::vector<VkLayerProperties> layers(instanceLayerCount);
   VK_CHECK(vkEnumerateInstanceLayerProperties(&instanceLayerCount, layers.data()));
   ```

2. 将可用的layer的命名转换为字符串：

   ```c++
   std::vector<std::string> availableLayers;
   std::transform(layers.being(), layers.end(), std::back_insert(availableLayers), \
   [](const VkLayerProperties& poperties) {return properties.layerName;});
   ```

3. 最后，我们需要从可用的layer中筛选出我们需要的layer。

   ```c++
   std::unordered_set<std::string> filterExtensions(
       std::vector<std::string> availableExtensions,
       std::vector<std::string> requestedExtensions) {
       std::sort(availableExtensions.begin(),
                 availableExtensions.end());
       std::sort(requestedExtensions.begin(),
                 requestedExtensions.end());
       std::vector<std::string> result;
       std::set_intersection(
           availableExtensions.begin(),
           availableExtensions.end(),
           requestedExtensions.begin(),
           requestedExtensions.end(),
           std::back_inserter(result));
       return std::unordered_set<std::string>(
           result.begin(), result.end());
   }
   ```

获取实例级别的扩展的过程也是类似的，这里就不再展开描述了。

---

### Initializing the Vulkan instance

Vulkan实例是我们要创建的第一个对象。它表示我们的应用程序与Vulkan运行时之间的链接，所以在应用程序中有且只有一个`VkInstance`。

存储了使用Vulkan所需要的与应用程序相关（或者说特定于应用程序层面）的特定状态。因此，在创建VkInstance时，我们必须指定要启用的层（如Validation Layer）和扩展。

创建过程也很简单，我们需要分别创建一个存储应用程序相关信息的结构体

```c++
const VkApplicationInfo applicationInfo_ = {
    .sType = VK_STRUCTURE_TYPE_APPLICATION_INFO,
    .pApplicationName = "Essential Graphics With Vulkan",
    .applicationVersion = VK_MAKE_VERSION(1, 0, 0),
    .apiVersion = VK_API_VERSION_1_3,
};
```

以及存储Vulkan实例信息的结构体

```c++
const VkInstanceCreateInfo instanceInfo = {
    .sType =
        VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO,
    .pApplicationInfo = &applicationInfo_,
    .enabledLayerCount = static_cast<uint32_t>(
        requestedLayers.size()),
    .ppEnabledLayerNames = requestedLayers.data(),
    .enabledExtensionCount = static_cast<uint32_t>(
        instanceExtensions.size()),
    .ppEnabledExtensionNames = instanceExtensions.data(),
};
VkInstance instance_{VK_NULL_HANDLE};
VK_CHECK(vkCreateInstance(&instanceInfo, nullptr,
                          &instance_));
```

---

### Creating a surface

与OpenGL相同，将最终的渲染结果呈现到屏幕上需要窗口系统的支持，并且这个过程是与平台相关的。处于这个原因，Vulkan核心API并没有提供呈现渲染结果的功能，而是将相关的函数与类型以扩展的形式推出。在我们的系列博客中，我们不会涉及Windows平台以外的相关知识，所以我们需要使用到如下扩展：`VK_KHR_surface`，`VK_KHR_swapchain`以及`VK_KHR_win32_surface`

#### Getting ready

将渲染图像呈现到屏幕上，首先我们需要创建一个`VkSurfaceKHR`对象，它与操作系统的窗口系统接口相结合，运行Vulkan通过*surface*这个概念渲染图像。由于我们从物理设备中预留队列需要使用到`VkSurfaceKHR`对象，所以`VkSurfaceKHR`的创建需要在`VkInstance`创建后以及`VkPhysicalDevice`创建前完成。

#### How to do it...

创建`VkSurfaceKHR`对象很简单，但是我们需要获取窗口系统的支持：

1. 在Windows系统中，我们需要一个实例句柄`HINSTANCE`和一个窗口句柄`HWND`。我们的系列博客使用了GLFW，所以这个步骤所轻松很多：

   ```c++
   const auto window = glfwGetWin32Window(glfwWindow);
   
   #if defined(VK_USE_PLATFORM_WIN32_KHR) && \ defined(VK_KHR_win32_surface)
   if (enabledInstanceExtensions_.contains( VK_KHR_WIN32_SURFACE_EXTENSION_NAME)) 
   {
       if (window != nullptr) 
       {
           const VkWin32SurfaceCreateInfoKHR ci = 
           {
               .sType = VK_STRUCTURE_TYPE_WIN32_SURFACE_CREATE_INFO_KHR,
               .hinstance = GetModuleHandle(NULL),
               .hwnd = (HWND)window,
           };
           VK_CHECK(vkCreateWin32SurfaceKHR( instance_, &ci, nullptr, &surface_));
       }
   }
   #endif
   ```

2. GLFW为我们封装了这个过程，我们可以通过下面的函数调用直接创建一个`VkSurfaceKHR`对象：

   ```c++
   glfwCreateWindowSurface(instance, window, nullptr, &surface
   ```

---

### Enumerating Vulkan physical devices

我们的系统中可能存在多个支持Vulkan的GPU，我们需要从中选择一个最能满足我们需求的设备。

调用`vkEnumeratePhysicalDevices`，我们能够从VkInstance中枚举出所有可用的物理设备，接着我们通过`vkGetPhysicalDeviceProperties`和`vkGetPhysicalDeviceFeatures`，分别检视给定物理设备所具有的属性与特性，判断是否能够满足我们的需求。最终筛选得到的`VkPhysicalDevice`将用于创建`VkDevice`和获取队列等后续操作。

#### Getting ready

我们会将物理设备及其属性等封装到`VulkanCore::PhysicalDevice`这个类中

#### How to do it...

简单起见，我们直接获取第一个可用的物理设备：

```c++
std::vector<PhysicalDevice>

    Context::enumeratePhysicalDevices(const std::vector<std::string>& requestedExtensions) const 
{
    uint32_t deviceCount{0};

    VK_CHECK(vkEnumeratePhysicalDevices(instance_, &deviceCount, nullptr));
    ASSERT(deviceCount > 0,"No Vulkan devices found");

    std::vector<VkPhysicalDevice> devices(deviceCount);
    VK_CHECK(vkEnumeratePhysicalDevices(instance_, &deviceCount, devices.data()));

    std::vector<PhysicalDevice> physicalDevices;
    for (const auto device : devices)
    {
        physicalDevices.emplace_back(
            PhysicalDevice(device, surface_, requestedExtensions, printEnumerations_));
    }

    return physicalDevices;
}
```

---

### Enumerating physical device extensions

除了实例级别的扩展，Vulkan同样提供了物理设备级别的扩展，这些扩展的可用性会因特定的物理设备与驱动而异。所以，对于需要的设备级别的扩展，我们需要检测其可用性，并显性地启用。

#### Getting ready

同样的，我们通过`VulkanCore::PhysicalDevice`这个类来枚举和管理设备级别的扩展。

#### How to do it...

获取设备级别的扩展很简单，我们同样实现了将命名转换为字符串的函数

1. 通过`vkEnumerateDeviceExtensionsProperties`枚举所有的物理设备级别的扩展，我们会创建一个`VkExtensionProperties`数组，该结构体包含了扩展名、版本和扩展用途的简要描述

   ```c++
   uint32 propertyCount {0};
   VK_CHECK(vkEnumerateDeviceExtensionProperties(
       physicalDevice, nullptr, &propertyCount, nullptr));
   
   std::vector<VkExtensionProperties> properties(propertyCount);
   VK_CHECK(vkEnumerateDeviceExtensionProperties(
       physicalDevice, nullptr, &propertyCount, properties.data()));
   ```

2. 将扩展命名转换为`std::string`，在`VkExtensionProperties`数组仅保留扩展名：

   ```c++
   std::transform(
   	properties.begin(), properties.end(),
   	std::back_inserter(extensions), [](const VkExtensionProperties& property)
       {return std::string(property.extensionName);}
   ;)
   ```

3. 最后，我们只保留需要使用的扩展：

   ```c++
   enabledExtensions = util：：filterExtensions(extensions, requestedExtensions);
   ```
   

---

### Caching the properties of queue families

在Vulkan中，一个物理设备可以有一个或多个队列族，每个队列族表示一组具有相似属性的队列，每个队列族支持一组特定的可以并行执行的操作或命令，如下图所示：

![](B18491_01_03.jpg)

#### Getting ready

在本系列博客中，我们将队列族及其属性和`VkPhysicalDevice`对象一起封装在`VulkanCore::PhysicalDevice`这个类，便于操作与管理。

#### How to do it...

每个队列族都有一组自己的属性，例如队列数量、可执行的操作的类型，以及队列的优先级。当我们创建一个`VkDevice`对象时，我们就需要指定我们要使用的队列族和每种类型要使用的队列数量。

1. 通过`vkGetPhysicalDeviceQueueFamilityProperties`，获取队列族的可用性以及属性：

   ```c++
   uint32_t queueFamilyCount {0};
   
   vkGetPhysicalDeviceQueueFamilyProperties(physicalDevice, &queueFamilyCount, nullptr);
   queueFamilyProperties.reszie(queueFamilyCount);
   
   vkGetPhysicalDeviceQueueFamilyProperties(
   	physicalDevice, &queueFamilyCount, queueFamilyProperties.data());
   ```

---

### Reserving queue families

我们前面提到，在创建`VkDevice`对象时，我们需要指定要使用的队列族，以及每个队列族中的队列数量。而为了能够渲染并呈现渲染结果，我们通常需要至少一个负责执行图形指令的图形队列族。除此以外，我们还可能需要一个计算队列族用于执行计算工作载荷，以及一个传递队列族用于传递数据

在本小节中，我们将学习如何根据所需的队列族的属性找到匹配的队列族，以及如何选择出一个支持呈现功能的队列族。

#### Getting ready

不用多说，这部分同样用`VulkanCore::PhysicalDevice`类进行管理

#### How to do it...

1. 在前面的环节中，我们已经从物理设备中获取了队列族属性，并存储在`queueFamilyProperties`数组中。现在，我们需要遍历该数组，判断是否某个属性满足我们当前的队列需求，如果是的话，就可以保留当前索引，也就是我们会传递给VkDevice的队列索引。

   ```c++
   uint32_t graphicsFamilyIndex {UINT32_MAX};
   uint32_t presentationFamilyIndex[UINT32_MAX];
   for (uint32_t queueFamilyIndex = 0; 
        queueFamilyIndex < queueFamilyProperties.size() && requestedQueueType != 0;
        queueFamilyIndex++)
   {
       if (graphicsFamilyIndex == UINT32_MAX && 
           (queueFamilyProperties[queueFamilyIndex].queueFlags & VK_QUEUE_GRAPHICS_BIT))
       {
           graphicsFamilyIndex= queueFamilyIndex;
       }
   }
   ```

2. 判断一个队列组能够支持呈现的功能，我们可以使用`vkGetPhysicalDeviceSurfaceSupportKHR`函数

   ```c++
   #if defined(VK_KHR_surface)
   	if (enabledInstanceExtensions.contains(VK_KHR_SURFACE_EXTENSION_NAME)
   	{
   		if (presentationFamilyIndex == UINT32_MAX && surface != VK_NULL_HANDLE)
           {
               VkBool32 supportsPresent {VK_FALSE};
               vkGetPhysicalDeviceSurfaceSupportKHR(physicalDevice, queueFamilyIndex, surface, &supportsPresent);
               if (supportsPresent == VK_TRUE)
                   presentFamilyIndex = queueFamilyIndex;
                
           }
   	}
   #endif 
   }
   ```

3. 其他类型的队列族索引也可以通过类似的方式获取。

---

### Creating a Vulkan logical device

`VkDevice`对象是一个物理设备的逻辑上的表示方式，我们可以简要归纳出以下几点

- 所有的图形与计算操作需要获取`VkDevice`对象的引用
- `VkDevice`可以通过队列来访问并获取GPU的功能，其中，队列用于想GPU提交命令，如绘制和传递内存数据
- 通过`VkDevice`，我们可以获取到一些其他的Vulkan对象，如管线，buffer，图像。

#### Getting ready

在本系列博客中，我们用`VulkanCore::Context`类来表示一个Vulkan逻辑设备

#### How to do it...

为了创建一个`VkDevice`对象，我们需要提供一个`VkPhysicalDevice`对象和想要使用的队列族的索引，对于后者，我们可以这些信息填充到`VkDeviceQUeueCreateInfo`中，同样填充到这个结构体中的信息还包括每个队列族中的数量和相对的优先值。

1. 绝大多数情况下，每个队列族我们会使用一个队列，并且将其优先值设置为`1`

   ```c++
   auto physicalDevice = enumeratePhysicalDevices(requestedExtensions)[0];
   const std::vector<uint32_t> familyIndices = physicalDevice.reservedFamilies();
   
   std::vector<VkDeviceQueueCreateInfo> queueCreatInfos;
   float priority {1.0f};
   
   for (const auto& queueFamilyIndex : familyIndices)
   {
       queueCreateInfos.emplace_back(
           VkDeviceQueueInfo
           {
               .sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO,
               .queueFamilyIndex = queueFamilyIndex,
               .queueCount = 1,
               .pQueuePriorities = &priority,
           });
   }
   ```

2. 现在，我们有了一切创建`VkDevice`对象所需要的信息：

   ```c++
   std::vector<const char*> deviceExtentions(physicalDevice.enabledExtensions.size());
   std::transform(
   	physicalDevice.enabledExtensions.begin(),
   	physicalDevice.enabledExtensions.end(),
   	deviceExtensions.begin(), 
       std::men_fn(&std::string::c_str)
   );
   
   const VkDeviceCreaterInfo creatInfo =
   {
       .sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO,
       .queueCraeteInfoCount = static_cast<uint32_t>(queueCreatInfos.size()),
       .pQueueCreateInfo = queueCreatInfos.data(),
       .enabledLayerCount = static_cast<uint32_t>(requesedLayers.size()),
       .ppEnabledLayerNames = requesedLayers.data(),
       .enableExtensionsCount = static_cast<uint32_t>(deviceExtentsions.size()),
       .ppEnabledExtensionNames = deviceExtentsions.data(),
   };
   VK_CHECK(vkCreateDevice(physicalDevice.vkPhysicalDevice(), &createInfo, nullptr, &device));
   ```

`VkDevice`几乎是Vulkan中最重要的一个对象，创建绝大多数的Vulkan对象都需要获取`VkDevice`的引用。

---

