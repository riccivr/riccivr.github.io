# The duality of working in the cloud and hacking in C99

*Published: September 9, 2026. Category: Career & Systems. Reading time: ~5 min*
*Tags: Career, C99, Cloud, TypeScript, PHP, Architecture, Reflections*

---

For over twelve years, my professional career has lived in the world of high-level web engineering, distributed systems, and cloud infrastructure.

I started back in 2012 in Venezuela, writing PHP, managing LAMP servers, tuning SQL queries, and automating intranet scrapers. Over the years, that path took me from vanilla OOP and Laravel/Symfony into building microservices at BBVA in Madrid, processing massive product feeds with AMQP and Lambdas at Billionhands, and building core cloud architectures and product features with TypeScript, AWS CDK, and serverless backends at Enroly.

That is the day job. It pays the bills, solves business problems, and scales to thousands of users.

When I close my work laptop and open a terminal to write code for myself, my brain wants something completely different. I write C99, build POSIX stream filters, experiment with embedded hardware, and dig into binary formats.

For a long time, I kept that side of my work to myself. Now that this entire website is filled with low-level projects, I find myself thinking about what that means.

---

## 1. Two different ways of thinking

Working in cloud engineering and writing low-level C require opposite mental models.

In the cloud world, you orchestrate abstractions. You spend your day wiring AWS services with CDK, defining TypeScript interfaces, tuning API routes, handling message queues, and managing dependency trees. The goal is shipping reliable features quickly. If an API request responds in 80 milliseconds, that is considered good performance.

In C99 and embedded systems, you strip away every abstraction. There is no garbage collector, no runtime, and no framework handling edge cases for you. You care about:

- Memory layout and buffer boundaries.
- POSIX system calls and file descriptor lifecycles.
- Cache lines and algorithmic overhead.
- Keeping binaries small and dependencies at zero.

When you switch between these two modes daily, you see systems from both ends.

---

## 2. The quiet hobby I used to hide

For years, I kept these two sides of my engineering life completely separate.

My resume, LinkedIn, and public professional footprint showed the pragmatic senior cloud engineer. I highlighted my experience with TypeScript, React, Node, AWS CDK, Lambda@Edge, and scalable cloud architectures.

My C99 projects, custom terminal filters like [`approx`](https://github.com/riccivr/approx), clipboard parsers like [`unipaste`](https://github.com/riccivr/unipaste), and Git object store engines like [`gitcrawl`](https://github.com/riccivr/gitcrawl) stayed mostly in private folders or quiet GitHub repositories.

A few weeks ago, I rebuilt this personal website. Instead of putting up a generic portfolio page, I decided to document the exact low-level systems and tools I actually enjoy building. Now, the homepage and blog are packed with C99 code snippets, terminal scanlines, and POSIX plumbing.

---

## 3. Will this confuse recruiters?

Putting all of this out in the open made me pause.

When a recruiter or hiring manager looks for a Senior Full-Stack Engineer, Staff Developer, or Cloud Architect, they expect to see familiar buzzwords: React, Node, TypeScript, AWS, Docker, Kubernetes, or serverless architectures.

If they land on this site instead, they see C99 structs, manual memory management, and articles about Git internals. It raises practical questions:

- Will a recruiter look at this and think I only want embedded or systems programming jobs?
- Will automated screening tools or non-technical screeners get confused about my primary stack?
- Could having a site full of low-level projects actually cost me web and cloud opportunities?

In an industry where developers are often expected to fit into neat, standardized job titles, showing two distinct skill sets can look messy to an outside observer.

---

## 4. Why low-level hacking makes you a better cloud engineer

Even if it confuses a few hiring pipelines, I think understanding low-level systems is one of the most useful skills a cloud developer can have.

High-level runtimes do not eliminate system complexity. They just hide it until something breaks.

When a Node process runs out of memory in a container, or a Lambda worker suffers from socket exhaustion under high concurrency, you cannot solve the issue by adding more abstractions. You need to understand how the operating system handles memory pages, network buffers, and I/O polling.

Writing C99 and working with embedded hardware keeps those fundamentals sharp:

1. **No magic.** You understand what the runtime is doing under the hood because you have implemented those data structures yourself.
2. **Resource awareness.** After spending hours fitting code into microcontrollers with kilobytes of RAM, you naturally write leaner, more efficient cloud services.
3. **Calm debugging.** When a high-level library fails with an obscure error, you can read the underlying C bindings or inspect system calls with strace without panic.

I could have kept my personal site sanitized and focused purely on enterprise web stacks. But this blog is an honest reflection of how I work and what I build.
