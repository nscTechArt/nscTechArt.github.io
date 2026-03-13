---
title: Claude Code in Action
date: 2026-02-15 21:45 +0800
categories: [AI, Anthropic Courses]
media_subpath: /assets/img/AI/AnthropicCourses
---

> 本文翻译自[Claude Code in Action](https://anthropic.skilljar.com/claude-code-in-action)

# About this course

在本篇博客中，我们将会了解到以下内容：

- **理解编程助手架构**：了解AI助手是如何通过工具交互与代码库交互，以及实现代码分析与修改所依赖的技术基础
- **探索ClaudeCode的工具使用系统**：发现如何结合使用多个工具来处理各种开发场景中的复杂、多步编程任务
- 掌握上下文管理技巧：
- 实现可视化的交流工作流：
- 创建自定义自动化：
- **使用MCP服务器扩展功能**
- 集成GitHub工作流
- 使用思考与计划两种模式

---

# What is Claude Code

## What is a coding assistant

### How Coding Assistants Work

当我们给编程助手一个任务，比方说根据error message修复bug，编程助手会采用与人类类似的解决问题的思路：

![](instructor_a46l9irobhg0f5webscixp0bs_public_1750967940_002_-_What_is_a_Coding_Assistant__02.1750967940100.png)

展开来说：

1. **收集上下文**：理解报错指的是什么、与哪些文件相关、影响了哪一部分代码库
2. **制定计划**：判断如何修复问题，比方说如何修改代码，如何运行测试等
3. **执行**：通过更新文件、运行指令来实际地落实解决方案

这里的重点是，第一步与第三步都需要编程助手与外部环境进行交互——读取文件、运行命令等等。

### The Tool-Use Challenge

这就是问题所在了。语言模型本身只能处理文本并返回文本，它们无法实际读取文件或运行命令。

那编程工具是如何解决这个问题的呢？依靠的是一个被称为“Tool Use”的系统。

### How Tool Use Works

当我们向编程助手发送请求时，它会自动地为我们的信息添加指令，来指导语言模型如何请求操作。比方说，它可能会添加这样的文本：“如果你想要读取文件，请回复'ReadFile: name of file'”。

以下是一个完整的工作流：

1. 用户会问：“main.go文件中写了什么内容？”
2. 编程助手向我们的请求中添加工具指令tool instructions
3. 语言模型回复：“ReadFile: main.go”
4. 编程助手读取实际的文件，并将其内容传递给语言模型
5. 语言模型根据文件内容，给出最终的回答

![](instructor_a46l9irobhg0f5webscixp0bs_public_1750967942_002_-_What_is_a_Coding_Assistant__14.1750967942536.png)

简而言之，这个Tool Use系统允许语言模型高效地读取文件、写代码、运行命令，尽管实际上它们只是在生成格式化的文本。

## Claude Code in action

Claude Code自带一套全面的内置工具，可以处理常见的开发任务，如读取文件、编写代码、运行命令和管理目录。但真正让Claude Code强大的是它如何智能地结合这些工具来应对复杂的多步骤问题。

官方提供了一个视频，视频包含了一些例子来更好地说明上面这段内容：

[Claude Code in action](https://anthropic.skilljar.com/claude-code-in-action/303242)

---

# Getting hands on

## Claude Code setup

安装可以参考官方提供的[Quicstart](https://code.claude.com/docs/en/quickstart)

这里在贴一些当时的踩坑记录：

- [在中国使用 Claude Code 解决 403 错误 - 完整指南（中文版）](https://gist.github.com/docularxu/db0053008b9f41328f29d39ffcf7c2b2)
- [哈基米API站](https://docs.gemai.cc/)

## Project setup

官方提供了一个小的UI项目，不过我使用的是我的博客源码（通过GitHub Pages与Jekyll构建）。

## Adding context

在与Claude Code交互时，最好提供给Claude Code准确有效的上下文，过多无关的上下文会降低Claude Code的性能。

### The /init Command

用Claude Code跑一个新的工程时，可以使用`/init`命令，告诉Claude Code去分析整个codebase并理解：

- 工程的目的与架构
- 重要的指令与关键的文件
- 代码的规范与结构

当分析完成后，Claude Code会创建一个summary，并将其写入`CLAUDE.md`文件。

### The CLAUDE.md File

`CLAUDE.md`文件有两个主要作用：

- 让Claude Code理解工程与codebase，包括代码规范、重要指令等等信息
- 允许我们给Claude Code特定或自定义的指令

这个文件会被包含在我们对Claude Code的每次请求里，所以它更像是一个工程中的持久化系统级Prompt。

### CLAUDE.md File Locations

Claude Code会在三个常见位置识别三个不同意义的CLAUDE.md文件，如下图所示：

![](instructor_a46l9irobhg0f5webscixp0bs_public_1750967941_004_-_Adding_Context_09.1750967941793.png)

### Adding Custom Instructions

我们可以通过在`CLAUDE.md`文件中添加指令的方式，来自定义Claude Code的行为。比方说，如果Claude Code向代码中添加了过多的注释，我们可以通过更新`CLAUDE.md`文件来解决这个问题。

在Claude Code中，我们可以使用`#`命令来进入“memory模式”，也就是允许我们编辑`CLAUDE.md`文件，例如：

```
# Use comments sparingly. Only comment complex code.
```

这样的话，Claude Code会自动将这个指令并入到`CLAUDE.md`中

### File Mentions with '@'

使用`@`可以让对Claude Code发起的请求中包含特定的文件。

我们也可以使用@将特定的文件包含在`CLAUDE.md`中，通过这种方式，相关文件的内容会自动包含在每次的请求中，无需再次搜索并读取。

## Making changes

在使用Claude Code中，一定会有让Claude Code参与修改工程的需求。下面这几个技巧可能会让Claude Code在完成修改任务时更有有效。

### Using Screenshots for Precis Communication

emm，这个跟工程的性质有关，如果是UI这种前端项目，提供截图并说明“我想让这个居中”肯定是有帮助的。

### Planning Mode

对于一些复杂的任务，可以开启Claude Code的Planning模式，从而可以让Claude Code在着手改动前对工程进行更深层次的搜索和理解。

通过按两次Shift + Tab就可以启用Planning模式了，在这个模式下，Claude Code会：

- 读取更多的文件
- 创建一个详细的实施计划
- 准确地向你说明它打算做的事情
- 等待你的确认

这样一来，我们就可以判断Claude Code的方向是否正确，并给出更准确的引导。

### Thinking Modes

Claude Code通过Thinking模式提供了不同级别的推理能力，允许Claude Code使用更多的时间（和token）来推理复杂的问题。可选的Thinking模式包括，推理能力递进的。

- Think
- Think More
- Think a lot
- Think longer
- Ultrathink

### When to Use Planning vs Thinking

我们在前面所提到的两种模式能够应对不同类型的复杂度。

**Planning模式**更适合：

- 需要对工程级别的codebase有了解
- 多步骤实现
- 多个文件的修改

**Thinking模式**更适合：

- 复杂的逻辑问题
- Debug比较严重的issue
- 算法问题

最好根据需求合理地应用Claude Code的多个模式。

## Controlling context

在使用Claude Code解决复杂的任务时，我们经常需要引导对话，保持Claude Code的专注与高效。下面几种方法可以帮助我们控制对话的流程，帮助Claude Code保持方向。

### Interrupting Claude Code with Escape

有时候Claude Code会走到错误的方向，或者反复尝试解决一个问题。这时候我们可以使用`Escape`键终止Claude Code，进而重新导向对话。

这对于我们想要让Claude Code专注于一个问题而非同时解决多个问题时非常有帮助。

### Combining Escape with Memorise

`Escape`技巧最重要的应用之一就是修复解决重复性的问题。当Claude Code在多个不同的对话间重复犯相同的错误时，我们就可以：

- 按下`Escape`来终止当前的response
- 使用`#`来添加对正确方法的记忆
- 有了正确的信息后，继续对话

这能够避免Claude Code在之后的对话中继续犯相同的错误。

### Rewinding Conversations

当对话变长时，我们可能为Claude Code积累了了一些不相关或有干扰的上下文。比方说，当Claude Code遇到了一个报错，并花了一定时间修复这个报错后，前前后后的对话对于下个任务来说就可能变得没有太大作用了。

此时，我们可以双击Escape来回访对话，这会显示出所有你发送过的信息，允许你跳回到之前的某个节点，帮助你：

- 维护有用的上下文
- 清楚错误的、多余的讨论历史
- 保持Claude Code在当前任务的专注

### Context  Management Commands

Claude Code还提供了一些命令，来帮助我们高效地管理上下文：

**`/compact`**

这个命令会总结整个对话历史，同时保留Claude Code学到的关键信息。这对于下面这些情况尤为理想：

- Claude Code获取到了关于项目中有价值的知识
- 我们想要继续相关任务
- 对话变得很长，但包含重要的上下文

简而言之，当Claude Code对当前任务有深入了解，并且你希望将其知识保持到下一个相关任务时，就可以使用这个命令了。

**`/clear`**

这个命令用于移除对话历史，开始新的对话。下列情况使用使用这个命令：

- 切换了一个全新的、不相关的任务
- 当前对话的上下文会影响Claude Code完成下一个新的任务
- 需要一个全新的对话

## Custom Commands

在Claude Code中，我们可以通过键入/来访问Claude Code内置的命令。同时，我们也可以自定义命令来完成一些我们经常用到的重复性任务。

### Creating Custom Commands

创建自定义命令的步骤如下：

1. 找到工程中的`.claude`文件夹
2. 在其中创建一个新的文件夹，命名为`commands`
3. 创建一个新的markdown文件，并以你所需要的命令为命名

这个markdown文件的命名将会成为新的自定义命令的名字。即`audit.md`对应`/audit`的命令。

### Example：Audit Command

这是官方教程中所举的例子，这个自定义命令用来检查项目依赖项以排查漏洞。

这个audit命令会做下面三件事：

1. 执行`npm audit`来查找有漏洞的安装过的包体
2. 执行`npm audit fix`来应用更新
3. 执行测试来确保更新没有引入新的问题

创建完新的命令后，我们需要重启Claude Code，这样Claude Code才会识别出新的命令。

### Commands with Arguments

自定义命令可以使用`$ARGUMENTS`占位符来接受参数。这使得命令更为有用和灵活。

比方说，`write_tests.md`这个命令的内容如下：

```markdown
Write comprehensive tests for: $ARGUMENTS

Testing conventions:
* Use Vitests with React Testing Library
* Place test files in a __tests__ directory in the same folder as the source file
* Name test files as [filename].test.ts(x)
* Use @/ prefix for imports

Coverage:
* Test happy paths
* Test edge cases
* Test error states
```

这样的话，我们可以在运行命令时一起输入一个文件路径：

`/write_tests the use-auth.ts file in the hooks directory`

需要注意的是，参数并不一定需要是文件路径，它们可以是任何你想要传递给Claude Code上下文或者任务相关的描述/方向的字符串。

### Key Benefits

- Automation——将重复性的工作流编程一个单一的命令
- Consistency——确保每次执行时都是相同的步骤
- Context——为Claude Code提供了特定的指令与项目级别的规范
- Flexibility——使用参数让命令可以用到不同的输入

自定义命令特别适用于特定项目的流程，例如运行测试套件、部署代码或遵循团队的规范生成样板代码。

## MCP servers with Claude Code

我们可以通过添加MCP servers的方式来拓展Claude Code的能力。这些servers可能运行在远端也可以在本地，会为Claude Code提供新的工具，解锁新的能力。最流行MCP servers之一是Playwright，它能够让Claude Code控制浏览器，进而增加Claude Code在执行网页开发时的能力。

不过我不是做前端开发的，所以官方教程中的例子并没有过多深入。

### Installing the Playwright MCP Server

下载MCP servers，我们需要在CMD（不是Claude Code）中运行：

```cmd
claude mcp add playwright npx @playwright/mcp@latest
```

这个命令做了两件事：

- 将这个MCP server命名为“playwright”
- 提供在本机上启动server的命令

### Managing Permissions

在运行某些MCP servers工具时，Claude每次都会请求我们的允许。我们可以通过Claude Code的设置来避免这样。

打开`.claude/settings.local.json`，并将对应的MCP server添加到“allow”中：

```json
{
  "permissions": {
    "allow": ["mcp__playwright"],
    "deny": []
  }
}
```

需要注意的是，`mcp__playwright`中是两个下划线。

### Exploring Other MCP Servers

考虑寻找符合特定开发需求的MCP servers。它们可以将Claude Code从一个代码助手转变为一个全面的开发合作伙伴，能够整个工具链进行交互。

## GitHub integration

这部分暂时不需要，我就先把链接贴上来了：[Github integration](https://anthropic.skilljar.com/claude-code-in-action/303240)

---

# Hooks and the SDK

## Introducing Hooks

Hooks允许我们在Claude Code运行工具的前后运行特定的指令。这对于实施一些自动化的工作流（比方说文件编辑后优化代码格式、运行测试、或阻止Claude Code访问特定文件）是非常有帮助的。

### How Hooks Work

要理解hooks，让我们首先回顾一下与Claude Code交互时的正常流程。当我们向Claude提问时，我们的查询会连同工具定义一起发送到Claude模型。Claude可能会通过提供格式化的响应来决定使用某个工具，然后Claude Code会执行该工具并返回结果。

hooks插入到这个过程中，允许你在工具执行之前或之后执行代码。

![](instructor_a46l9irobhg0f5webscixp0bs_public_1752618158_010_-_Introducing_Hooks_06.1752618158162.png)

有两种类型的hooks：

- **PreToolUse Hooks** —— 在工具被调用前运行
- **PostToolUse Hooks** —— 在工具被调用后运行

### Hook Configuration

Hooks被定义在Claude Code的配置文件中，我们可以通过以下路径进行添加：

- **Global** —— `~/.claude/settings.json` （影响所有工程）
- **Project** —— `~/.claude/settings.json` （commit后会与团队共享）
- **Project (not committed)** —— `~/.claude/settings.local.json` （个人设置）

Hooks的配置结构包含下面两个部分：

![](instructor_a46l9irobhg0f5webscixp0bs_public_1752618159_010_-_Introducing_Hooks_10.1752618159645.png)

### PreToolUse Hooks

PreToolUse hooks会在工具执行前被调用。他们包含了一个匹配机制，用于指定要针对哪些工具类型：

```json
"PreToolUse": [
  {
    "matcher": "Read",
    "hooks": [
      {
        "type": "command",
        "command": "node /home/hooks/read_hook.ts"
      }
    ]
  }
]
```

在‘Read'工具执行之前，上面的这个配置将会运行指定的命令。我们指令将会接受Claude Code想要进行的工具调用的详细信息，我们就完成下面这些任务：

- 允许操作正常进行
- 阻断工具调用，并向Claude发送一个报错信息

### PostToolUse Hooks

PostToolUse hooks则会在工具结束执行后开始运行。下面是一个例子，针对的时编辑文件的工具类型：

```json
"PostToolUse": [
  {
    "matcher": "Write|Edit|MultiEdit",
    "hooks": [
      {
        "type": "command", 
        "command": "node /home/hooks/edit_hook.ts"
      }
    ]
  }
]
```

此类hooks无法阻断工具的执行，但我们可以完成这些操作：

- 执行后续操作（比方说检查编辑后的代码是否符合规范、执行测试）
- 向Claude提供工具使用情况的额外反馈

![](instructor_a46l9irobhg0f5webscixp0bs_public_1752618160_010_-_Introducing_Hooks_15.1752618160073.png)

### Practical Applications

下面是一些hooks的常见用法：

- Code formatting
- Testing
- Access control
- Code quality
- Logging
- Validation

简而言之，hooks的核心理念在于将我们自己的工具集成在工作流中，从而拓宽Claude Code的能力。

**PreToolUse hooks 让你控制 Claude 能做什么，而 PostToolUse hooks则让你增强 Claude 已经做过的事情。**

## Defining hooks

官方教程中提供了两个学习用的工程：

- [queries.zip](https://cc.sj-cdn.net/instructor/4hdejjwplbrm-anthropic/assets/1773097175/queries.zip?response-content-disposition=attachment&Expires=1773391262&Signature=Fziyv9Zm3n77iCNaeu7nkDReWD94~QXhfBX1qhOQn~-E8jfCea61IT6ylNtwSbru8dBmZBjhICevjXzmngHYHDdTkKMCAkEkT51BgZfcQCJzCkk05BniVLAoHu3H17pH86gM3EU7eW0-hvD6UIei9GaPEVzZVzW1lub8w1kYocWPxfjHiik7GRIUxnbTVhITnYcvj-w0YhQnAoe9mn-cqblAe4ypbq7227QB6uyLefMJEuM4szKnydINyIa~RQ74pyal0cbhi0ijtSIthbHB8-3BM4rWfGRykC~GmZ~5pFk9YnbBUqhlbUowe4Uw6U6fvnrRl7SbErrJ~VlqmHssFg__&Key-Pair-Id=APKAI3B7HFD2VYJQK4MQ)
- [queries_COMPLETED.zip](https://cc.sj-cdn.net/instructor/4hdejjwplbrm-anthropic/assets/1773097185/queries_COMPLETED.zip?response-content-disposition=attachment&Expires=1773391262&Signature=L0npPhX2NRwt1AciHN9PlCZwRigutGeLHKU3XeuVpBPvwc9e9ajtz7qZFmq~a4SzspkxF2CeThKTRMf1p2Rt6BLoAlJIXhdLgNCeZDk7hxerOrmcu-lMjhbGlj-AEW9ZM7PMyZePW526RqBK8cG4hInrFwlU73qgR9vysA17YFX1CdGqwoivWaanmwC2e71zo~yAN7c3M~wjIK1BMLJjxg~jxypgkUTXN09J6smBLl-0aLy1Q0OLrt-lz5kSsrKBglHzfTTkxBcZXY92Jigtv3W-QMDcU3lRgZmmorV5obTtAtM3zDsZMUiwxIdCHhwtIm2RzIZ~A5PfHeeoFSHohg__&Key-Pair-Id=APKAI3B7HFD2VYJQK4MQ)

### Building a Hook

创建一个hook包含四个主要步骤：

![](instructor_a46l9irobhg0f5webscixp0bs_public_1752618153_011_-_Defining_Hooks_05.1752618152864.png)

1. **判断hook的类型是PreToolUse还是PostToolUse**
2. **确定hook要针对的是哪类工具调用**
3. **编写指令，用于接收工具调用** —— 这个指令通过标准输入来获取有关工具调用的json数据
4. **如果有必要，指令需要向Claude提供反馈** —— 指令通过exit code来告诉Claude是否运行或阻断特定操作

### Available Tools

Claude Code内置了很多工具，我们可以使用hooks来监控这些工具：

![](instructor_a46l9irobhg0f5webscixp0bs_public_1752618153_011_-_Defining_Hooks_07.1752618153492.png)

实际上我们可以让Claude Code告诉我们当前都有哪些工具，特别是当你开启了很多MCP servers时（会自带很多工具）。

### Tool Call Data Structure

当我们的hook命令执行时，Claude 通过标准输入发送包含有关提议工具调用详细信息的 JSON 数据：

![](instructor_a46l9irobhg0f5webscixp0bs_public_1752618154_011_-_Defining_Hooks_11.1752618154320.png)

接下来，我们的hook命令从标准输入读取这个JSON，解析它，然后根据工具名称和输入参数决定是否允许或阻止操作。

### Exit Codes and Control Flow

Hook命令会通过exit code与Claude继续交流：

![](instructor_a46l9irobhg0f5webscixp0bs_public_1752618154_011_-_Defining_Hooks_16.1752618154725.png)

- **Exit Code 0** —— 没问题，允许工具调用
- **Exit Code 2** —— 阻止工具调用（仅对于PreToolUse来说）

当我们的PreToolUse hook返回Exit Code 2时，报错信息将会作为反馈返回给Claude，并由Claude解释为什么这个操作被阻止了。

### Example Use Case

一个常见的例子是，我们需要禁止Claude读取一些敏感文件（比如`.env`文件）。由于Claude Code内置的`Read`与`Grep`工具都可以读文件，所以我们就需要针对这两个工具类型的调用，并检测它们是否在尝试访问敏感文件。

这种方法让我们对Claude的文件系统访问拥有完全控制权，同时提供清晰的反馈，说明为什么某些操作受到限制。

## Implementing a hook

### Setting Up the Hook Configuration

首先我们需要在设置文件中配置hooks。打开`.claude/settings.local.json`文件，并定位到hooks的部分。在我们这个例子中，我们需要创建的PreToolUse hook。

配置包含两个关键部分：

- **Matcher** —— 指定要针对哪些工具
- **Command** —— 当特定工具被调用时，Claude Code要运行的hook脚本

对于matcher，我们需要针对可读取文件的操作：

```json
"matcher" : "Read|Grep"
```

对于command，我们需要指定一个js脚本：

```json
"command": "node ./hooks/read_hook.js"
```

### Understading Tool Call Data

当Claude尝试使用某个工具时，hook会接收到来自标准输入的关于工具调用的信息（以JSON文件的形式）。具体来说，包括：

- Session ID和transcript path
- Hooks event name（在我们的案例中，是PreToolUse）
- Tool Name（比如说Read、Grep）
- Tool input parameters（包括文件路径）

Hook脚本处理这些数据，并可以通过退出特定代码来允许操作继续或阻止操作。

### Implementing the Hook Script

在这个案例中，hook脚本需要读取我们前面提到的信息，并根据我们的需要处理核心逻辑，类似：

```js
async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  
  const toolArgs = JSON.parse(Buffer.concat(chunks).toString());
  
  // Extract the file path Claude is trying to read
  const readPath = 
    toolArgs.tool_input?.file_path || toolArgs.tool_input?.path || "";
  
  // Check if Claude is trying to read the .env file
  if (readPath.includes('.env')) {
    console.error("You cannot read the .env file");
    process.exit(2);
  }
}
```

脚本检查文件路径中是否存在`.env`，如果存在则阻止操作。当以`Exit Code 2`退出时，Claude会收到错误消息，并理解操作是被hook阻止的。

### Key Benefits

这种方法提供了几个优点：

- **主动保护** - 在读取敏感数据之前阻止访问
- **透明操作** - Claude 理解操作失败的原因
- **灵活匹配** - 可与多种工具（如 read、grep 等）配合使用
- **清晰的反馈** - 提供有意义的错误信息

虽然这个具体示例专注于 `.env` 文件，但同样的模式可以保护项目中的任何敏感文件或目录。你可以扩展逻辑以检查多种文件模式，或根据你的安全需求实现更复杂的访问控制。

## Gotchas around hooks

接下来的几个小节会等对hook有更深入的了解后再来补充

[TODO]

[Gotchas around hooks](https://anthropic.skilljar.com/claude-code-in-action/312423)

## Useful hooks!

[TODO]

[Useful hooks!](https://anthropic.skilljar.com/claude-code-in-action/312004)

## Another useful hook

[TODO]

[Another useful hook](https://anthropic.skilljar.com/claude-code-in-action/312427)

## The Claude Code SDK

[TODO]

[The Claude Code SDK](https://anthropic.skilljar.com/claude-code-in-action/312001)