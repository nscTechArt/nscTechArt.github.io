---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/AdvancedLighting/HDR/index.html
title: HDR
---

### HDR

---

默认情况下，颜色和亮度都是存储在framebuffer中范围在[0, 1]的值。HDR能够让画面有更多的细节。

为了实现HDR的渲染，我们确保片段着色器运行时不会限制颜色值的范围。当framebuffer使用一个归一化的、fixed-point color format（比如`GL_RGB`)作为color buffer的内定格式，OpenGL就会在存储framebuffer之前，自动将值限定在[0, 1]中。对于大部分的framebuffer格式，OpenGL都会默认执行这个限制值的操作，除非是floating point。

如果frame buffer的color buffer所使用的格式是`GL_RGB16F`、`GL_RGBA16F`、`GL_RGB32F`、`GL_RGBA32F` 时，我们就称这个frame buffer是floating point framebuffer。创建的方式很简单，只需要修改它的color buffer所使用的internal format：

```c++
glBindTexture(GL_TEXTURE_2D, colorBuffer);
glTexImage(GL_TEXTURE_2D, 0, GL_RGBA16f, SCR_WIDTH, SCR_HEIGHT, 0, GL_RGBA, GL_FLOAT, nullptr);
```

创建好framebuffer 以后，我们就可以将场景渲染到这个framebuffer中，然后再将framebuffer的color buffer显示到screen quad上，大致流程如下：

```c++
glBindFramebuffer(GL_FRAMEBUFFER, hdrFBO);
glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
// render scene
[...]
glBindFramebuffer(GL_FRAMEBUFFER, 0);

// now render hdr color buffer to 2D screen-filling quad with tone mapping shader
hdrShader.use();
glActiveTexture(GL_TEXTURE0);
glBindTexture(GL_TEXTURE_2D, hdrColorBufferTexture);
RenderQuad();
```

将floating point color buffer texture绘制到屏幕上时，我们使用了`hdrShader`，它的片段着色器只包含一个pass：

```glsl
#version 330 core
out vec4 FragColor;

in vec2 TexCoords;

uniform sampler2D hdrBuffer;

void main()
{
	vec3 hdrColor = texture(hdrBuffer, TexCoords).rgb;
	FragColor = vec4(hdrColor, 1.0);
}
```

然而，这个片段着色器的输出结果会被直接渲染进OpenGL的默认framebuffer中，所有的颜色值还是会被限制在[0, 1]的范围内。

很明显，在隧道尽头的强光的值被约束在1.0，因为一大块区域都是白色的，过程中超过1.0的地方损失了所有细节。因为我们直接转换HDR值到LDR值，这就像我们根本就没有应用HDR一样。为了修复这个问题我们需要做的是无损转化所有浮点颜色值回0.0-1.0范围中。我们需要应用到色调映射

---

色调映射(Tone Mapping)是一个损失很小的转换浮点颜色值至我们所需的LDR[0.0, 1.0]范围内的过程，通常会伴有特定的风格的色平衡(Stylistic Color Balance)。

最简单的色调映射的算法时Reinhard色调映射，这个算法将所有亮度值均衡地映射到LDR上。我们将Reinhard色调映射加入到之前的片元着色器中，并且为了保险起见，还添加了一个Gamma校正过滤器（包括使用sRGB纹理）

```glsl
void main()
{
	const float gamma = 2.2;
	vec3 hdrColor = texture(hdrBuffer, TexCoords).rgb;
	
	// reinhard tone mapping
	vec3 mapped = hrdColor / (hdrColor + vec3(1.0));
	// gamma correction
	mapped = pow(mapped, vec3(1.0 / gamma));
	
	FragColor = vec4(mapped, 1.0);
}
```

色调映射还允许我们使用一个曝光参数值。我们前面提到过，HDR图片在不同的曝光级别下，有不同的可见的细节。简单的代码如下：

```glsl
uniform float exposure;

void main()
{
	const float gamma = 2.2;
	vec3 hdrColor = texture(hdrBuffer, TexCoords).rgb;
	
	// exposure tone mapping
	vec3 mapped = vec3(1.0) - exp(-hdrColor * exposure);
	// gamma correction
	mapped = pow(mapped, vec3(1.0 / gamma));
	
	FragColor = vec4(mapped, 1.0);
}
```

