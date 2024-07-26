---
title: Dear ImGui使用指南
date: 2024-07-26 10:40 +0800
categories: [Graphics, Misc]
---

### 配置ImGui

- 将[**ImGui项目**](https://github.com/ocornut/imgui/tree/docking)clone到本地，选择`docking`分支
- 将`imgui/`目录下的所有`.cpp`和`.h`文件都复制到`include/imgui/`目录中
- 将`imgui/backends/`目录下的与项目匹配的Platform和Renderer的`.cpp`和`.h`文件复制到`include/imgui/`目录中
- 在Visual Studio中，右键当前项目，选择“Add->Existing Items”，然后选择`include/imgui/`目录下的`.cpp`文件
- 编译项目，确认ImGui配置成功

### 在项目中使用ImGui

- 引用以下头文件

  ```c++
  #include "imgui.h"
  #include "imgui_impl_glfw.h"
  #include "imgui_impl_opengl3.h"
  ```

- 初始化ImGui

  ```c++
  // Setup Dear ImGui context
  IMGUI_CHECKVERSION();
  ImGui::CreateContext();
  ImGuiIO& io = ImGui::GetIO();
  io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;     // Enable Keyboard Controls
  io.ConfigFlags |= ImGuiConfigFlags_NavEnableGamepad;      // Enable Gamepad Controls
  io.ConfigFlags |= ImGuiConfigFlags_DockingEnable;         // IF using Docking Branch
  
  // Setup Platform/Renderer backends
  ImGui_ImplGlfw_InitForOpenGL(YOUR_WINDOW, true);          // Second param install_callback=true will install GLFW callbacks and chain to existing ones.
  ImGui_ImplOpenGL3_Init();
  ```

- 在渲染循环开始时：

  ```c++
  // (Your code calls glfwPollEvents())
  // ...
  // Start the Dear ImGui frame
  ImGui_ImplOpenGL3_NewFrame();
  ImGui_ImplGlfw_NewFrame();
  ImGui::NewFrame();
  ImGui::ShowDemoWindow(); // Show demo window! :)
  ```

- 在渲染循环结束时：

  ```c++
  // Rendering
  // (Your code clears your framebuffer, renders your other stuff etc.)
  ImGui::Render();
  ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());
  // (Your code calls glfwSwapBuffers() etc.)
  ```

- 在程序结束前：

  ```c++
  ImGui_ImplOpenGL3_Shutdown();
  ImGui_ImplGlfw_Shutdown();
  ImGui::DestroyContext();
  ```

这样就可以显示ImGui的Demo窗口。