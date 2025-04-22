---
title: Simple Vulkan Renderer - Core Concepts
date: 2024-09-06 22:41 +0800
categories: [Graphics, Vulkan Collections]
media_subpath: /assets/img/Graphics/vulkan collections/
math: false
---

### 1 `VkInstance`

`VkInstance`可以视为Vulkan API与应用程序之间的连接，其核心作用是**管理全局Vulkan状态**，如启用的扩展、Layer等。

创建VkInstance时，需要我们指定`VkApplicationInfo`（包括应用程序的名称、版本、API版本），以及启用哪些扩展与Layer：

```c++
void Context::createInstance()
{
    // first, initialize volk
    // ----------------------
    VK_CHECK(volkInitialize());

    // application info
    // ----------------
    const VkApplicationInfo appInfo = 
    {
        .sType = VK_STRUCTURE_TYPE_APPLICATION_INFO,
        .apiVersion = kAPIVersion,
    };

    // create instance
    // ---------------
    const VkInstanceCreateInfo instanceCreateInfo =
    {
        .sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO,
        .pNext = nullptr,
        .pApplicationInfo = &appInfo,
        .enabledLayerCount = uint32_t(mRequiredInstanceLayers.size()),
        .ppEnabledLayerNames = mRequiredInstanceLayers.data(),
        .enabledExtensionCount = uint32_t(mRequiredInstanceExtensions.size()),
        .ppEnabledExtensionNames = mRequiredInstanceExtensions.data(),  
    };
    VK_CHECK(vkCreateInstance(&instanceCreateInfo, nullptr, &mInstance));

    // initialize Volk for this instance
    // ---------------------------------
    volkLoadInstance(mInstance);
}
```

---

### 2 `VkDevice`

`VkDevice`表示对于物理设备（如GPU）的逻辑抽象，**负责管理设备级别的资源**，如队列、内存、管线等。

在创建`VkDevice`时，需要我们指定以下内容：

- 队列族索引
- 物理设备特性
- 物理设备扩展

此外，在创建时，我们还需要指定获取到的`VkPhysicalDevice`。

当创建完成后，我们需要获取逻辑设备所使用到的队列。

```c++
void Context::createLogicalDevice()
{
    // device queue create infos
    // -------------------------
    std::vector<VkDeviceQueueCreateInfo> queueCreateInfos;
    std::set<std::pair<uint32_t, uint32_t>> uniqueFamilyIndicesWithQueueCounts;
    uniqueFamilyIndicesWithQueueCounts.insert({mGraphicsQueueFamilyIndex.value(), mGraphicsQueueCount});
    uniqueFamilyIndicesWithQueueCounts.insert({mComputeQueueFamilyIndex.value(), mComputeQueueCount});
    uniqueFamilyIndicesWithQueueCounts.insert({mPresentQueueFamilyIndex.value(), mPresentQueueCount});
    std::vector<std::vector<float>> prioritiesForAllQueueFamilies(uniqueFamilyIndicesWithQueueCounts.size());
    for (size_t index = 0; const auto& [familyIndex, queueCount] : uniqueFamilyIndicesWithQueueCounts)
    {
        prioritiesForAllQueueFamilies[index].resize(queueCount, 1.0f);
        queueCreateInfos.push_back(VkDeviceQueueCreateInfo{
            .sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO,
            .queueFamilyIndex = familyIndex,
            .queueCount = queueCount,
            .pQueuePriorities = prioritiesForAllQueueFamilies[index++].data(),
        });
    }

    // device features
    // ---------------
    VkPhysicalDeviceFeatures2 enabledFeatures2 = 
    {
        .sType = VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2,
        .features = enabledFeatures,
    };
    FeatureChain featureChain(&enabledFeatures2);
    featureChain.pushBack(enabledVulkan12Features);
    featureChain.pushBack(enabledVulkan13Features);
    featureChain.pushBack(enabledMeshShaderFeatures);
    featureChain.pushBack(enabledBarycentricFeatures);

    // device create info 
    const VkDeviceCreateInfo deviceCreateInfo = 
    {
        .sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO,
        .pNext = featureChain.getFirstNext(),
        .queueCreateInfoCount = uint32_t(queueCreateInfos.size()),
        .pQueueCreateInfos = queueCreateInfos.data(),
        .enabledExtensionCount = uint32_t(mRequiredDeviceExtensions.size()),
        .ppEnabledExtensionNames = mRequiredDeviceExtensions.data(),
    };
    VK_CHECK(vkCreateDevice(mPhysicalDevice, &deviceCreateInfo, nullptr, &mDevice));  

    // get queues that are used by the logic device
    // --------------------------------------------
    // graphics queues
    mGraphicsQueues.resize(mGraphicsQueueCount, VK_NULL_HANDLE);
    for (uint32_t i = 0; i < mGraphicsQueueCount; i++)
        vkGetDeviceQueue(mDevice, mGraphicsQueueFamilyIndex.value(), i, &mGraphicsQueues[i]);
    // compute queues
    mComputeQueues.resize(mComputeQueueCount, VK_NULL_HANDLE);
    for (uint32_t i = 0; i < mComputeQueueCount; i++)
        vkGetDeviceQueue(mDevice, mComputeQueueFamilyIndex.value(), i, &mComputeQueues[i]);
    // present queue
    vkGetDeviceQueue(mDevice, mPresentQueueFamilyIndex.value(), 0, &mPresentQueue);
}

```

---

### 3 Vulkan Graphics Pipeline

在Vulkan中，图形管线是图形渲染的核心执行单元，它定义了如何将输入数据通过一系列处理阶段，转化为最终的渲染结果。

要创建渲染管线，我们需要配置以下这些组件：

- shader stage
- vertex input，即顶点数据格式
- input assembly，即图元拓扑类型
- 视口与裁剪，也可以通过动态状态设置
- 光栅化，包括多边形填充模式、背面剔除、深度偏移等
- 多重采样
- 深度/模版测试
- 颜色混合
- 管线布局，包括描述集布局与推送常量范围
- render pass，定义管线与帧缓冲区附件的兼容性

---

### 4 描述符集

描述符集本质上是资源（如纹理、缓冲区）的集合，通过描述符定义这些资源在shader中的访问方式。