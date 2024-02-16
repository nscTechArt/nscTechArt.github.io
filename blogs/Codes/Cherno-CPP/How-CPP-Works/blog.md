---
layout: page
permalink: /blogs/Codes/Cherno-CPP/How-CPP-Works/index.html
title: How C++ Works
---

### How C++ Works

#### Intro

我们将要了解如何从source file(actual text file)到actual executable binary or program。

写一个C++程序的基本workflow是：编写一系列Source File，也就是你通过键盘敲出来的代码，会被compiler编译成一些二进制文件，这些二进制Binary既可以是library，可以是可执行程序。这篇博客我们主要了解后者，也就是executable program/binary。

---

#### Preprocessor Statements

在C++程序中，我们将`#include <iostream>`这种以`#`打头的语句，称为Preprocessor Statements。当一个compiler接收到一个源文件时，编译器所做的第一件事就是预处理所有的preprocessor statements。

以`#include <iostream>`为例，`#include`会寻找一个名为iostream的文件，并且将iostream文件的所有内容，复制粘贴到当前的源文件中。还有一些其他常见的预处理指令：`#define`,  `#ifde`f，`#ifndef`，`#if`，`#else`和`#endif`

---

#### Entry Point

在C++中，main()函数被称之为Entry Point，它是程序开始的地方。每个C++程序都要有一个main函数，程序在运行时，首先执行main函数中的代码。main函数默认返回一个状态码0，表示程序运行成功。

---

#### Compile

当预处理完成预处理指令后，编译器就开始编译程序源码了。编译首先要做的是将C++代码转换为machine code，在Visual Studio中，有一些设置可以配置这一过程。

以Visual Studio为例，**Solution Configuration**用于管理项目编译的方式。这些设置通常包括"Debug"和"Release"：

- **Debug模式**：这是在开发和调试代码时常用的配置。这种配置不会进行大多数优化操作，以便可以更轻松地调试代码（例如，保留变量的值，即使编译器可能会优化它们）。Debug模式还会包含更多的调试信息，使开发者能够查看调用堆栈、设置断点等。

- **Release模式**：这是在项目准备好发布后使用的配置。这种配置启用了编译器的优化，包括代码优化和内存使用优化，因此编译出的代码运行速度更快，占用的空间更小。这种模式一般不包含完整的调试信息，因此生成的二进制文件体积会小很多。

**Solution Platform**用于指定应该为哪个硬件平台编译代码。常见的平台有"x86"和"x64"，指的是目标处理器架构。

- x86：这个选项会为32位操作系统编译代码。生成的应用程序能在32位或64位系统上运行，但在64位系统上运行时，操作系统会在32位的兼容环境(Windows中的WOW64)下运行这个程序。

- x64：这个选项会为64位操作系统编译代码。生成的应用程序只能在64位系统上运行。这个设置让程序可以访问更多内存，并且在某些情况下可能会运行得更快，因为它可以使用64位处理器提供的一些特性。



在C++中，每个.cpp文件都会被编译，但是.h头文件并不会被编译，头文件只会被预处理指令复制粘贴进.cpp文件，然后在.cpp文件中参与编译。

.cpp文件会被编译器转换为二进制代码，这些代码包含在所谓的object文件中，通常文件后缀是.object、.o。

但是每个cpp都是被独立编译的，我们还需要将所有的object文件链接在一起，从而生成可执行文件，让各个模块形成一个完整的程序。

**C++程序编译的基本步骤可以总结为：预处理、编译、链接**

---

#### Properties

在Visual Studio中，我们可以在**Properties**中进一步配置项目，不过配置的时候要确认对应的**Solution Configuration**和对应的**Solution Platform**。其中具体的信息我们将在以后结合项目来了解。

