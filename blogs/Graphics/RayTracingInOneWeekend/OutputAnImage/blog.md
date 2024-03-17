---
layout: page
permalink: /blogs/Graphics/RayTracingInOneWeekend/OutputAnImage/index.html
title: Output An Image
---

### Output An Image
---

#### The PPM Image Format

PPM格式是一种常见的光栅化图像文件格式之一，并且它的存储是无损的。PPM有两种编码方式，分别是ASCII和Binary，在PPM的头部分中用P3和P6表示。以下是一个PPM文件的示例：

```python
P3
# P3 means colors are in ASCII, then 3 columns and 2 rows
# then 255 for max color, then RGB triplets
3 2
255
255   0 0      0 255   0    0 0 255
255 255 0    255 255 255    0 0 0 
```

让我们在C++中输出这个PPM图片。

```c++
#include <iostream>

int main() {

    // Image
    int image_width = 256;
    int image_height = 256;

    // Render

    std::cout << "P3\n" << image_width << ' ' << image_height << "\n255\n";

    for (int j = 0; j < image_height; j++) {
        for (int i = 0; i < image_width; i++) {
            double r = double(i) / (image_width - 1);
            double g = double(j) / (image_height - 1);
            double b = 0;

            int ir = static_cast<int>(255.999 * r);
            int ig = static_cast<int>(255.999 * g);
            int ib = static_cast<int>(255.999 * b);

            std::cout << ir << ' ' << ig << ' ' << ib << '\n';
        }
    }
}
```

解释一下上面的代码：

- 像素逐行输出
- 每行的像素从左向右输出
- 行之间从上到下排列
- 根据惯例，红色/绿色/蓝色分量都由内部的实数变量表示，这些变量的范围从0.0到1.0。在输出它们之前，必须将这些值缩放到0到255之间的整数值
- 红色值从左向右明度逐渐变高，绿色从上到下明度逐渐变低。

---

#### Creating an Image File

目前文件会写入standard output stream，我们还需要将输出结果重新定向到图像文件。如果使用Visual Studio默认的项目设置，在命令行中使用下面代码就可以完成重定向，得到的图片会放在与解决方案同一个文件夹下。

```c
x64\Debug\RayTracingInOneWeekend.exe > image.ppm
```

![](files/ppm.png)

---

#### Adding a Process Indicator

在继续之前，让我们为输出结果添加一个进度指示器。这是一种追踪长时间渲染进度的便捷方法，也可以用来识别因无限循环或其他问题而停滞的运行。修改我们的C++代码。

```c++
for (int j = 0; j < image_height; j++) {
    std::clog << "\rScanlines remaining: " << image_height - j << ' ' << std::flush;
    for (int i = 0; i < image_width; i++) {
        double r = double(i) / (image_width - 1);
        double g = double(j) / (image_height - 1);
        double b = 0;

        int ir = static_cast<int>(255.999 * r);
        int ig = static_cast<int>(255.999 * g);
        int ib = static_cast<int>(255.999 * b);

        std::cout << ir << ' ' << ig << ' ' << ib << '\n';
    }
}

std::clog << "\rDone.               \n";
```
