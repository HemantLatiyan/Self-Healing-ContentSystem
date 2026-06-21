# Compute Engine Machine Families: Architect's Reference

Compute Engine offers a wide range of predefined and customizable virtual machine types, organized into machine families. Selecting the right family is one of the most consequential decisions a cloud architect makes, because it determines cost, performance, and the set of features available to the workload. This reference summarizes the machine families available on Compute Engine and the workloads each is best suited for.

## General Purpose Machine Families

General purpose machine families are the default choice for most workloads. They balance vCPU, memory, and price, and they are available in nearly every Google Cloud region.

### E2 Series

The E2 family is the most cost effective general purpose family. E2 instances run on a mix of Intel and AMD processors, with the specific underlying CPU abstracted by Google. E2 instances support up to 32 vCPUs and up to 128 GB of memory per instance. They do not support GPUs or local SSD storage.

E2 is appropriate for web servers, small to medium databases, development environments, and microservices that do not require sustained high performance. E2 instances are not recommended for latency sensitive workloads because their underlying hardware can vary.

### N2 Series

The N2 family runs on Intel Cascade Lake and Ice Lake processors. N2 instances support up to 128 vCPUs and up to 864 GB of memory. They support local SSD attachment and a wider range of CPU platforms than E2.

N2 is the recommended default for production web applications, medium databases, and enterprise applications that benefit from consistent performance.

### N2D Series

N2D is the AMD equivalent of N2, running on AMD EPYC Rome and Milan processors. N2D supports up to 224 vCPUs and up to 896 GB of memory, making it the largest general purpose family by vCPU count. N2D often delivers better price performance than N2 for workloads that scale linearly with vCPU count.

### T2D and T2A Series

T2D and T2A are general purpose families optimized for scale-out workloads. T2D runs on AMD EPYC Milan and supports up to 60 vCPUs. T2A runs on Ampere Altra Arm processors and supports up to 48 vCPUs.

These families are well suited for containerized microservices, web servers, and CI/CD workloads. T2A in particular allows architects to take advantage of Arm pricing, which is approximately 25 percent lower than equivalent x86 instances.

## Compute Optimized Machine Families

Compute optimized families are designed for workloads that are CPU bound.

### C2 Series

C2 instances run on Intel Cascade Lake processors with a sustained all-core turbo frequency of 3.8 GHz. C2 supports up to 60 vCPUs and up to 240 GB of memory.

C2 is recommended for gaming servers, electronic design automation, high performance computing, and any workload where single thread performance dominates.

### C2D Series

C2D is the AMD compute optimized family, running on AMD EPYC Milan. C2D supports up to 112 vCPUs and up to 832 GB of memory. C2D typically delivers higher throughput than C2 for parallel workloads while maintaining strong single thread performance.

## Memory Optimized Machine Families

Memory optimized families are designed for workloads with extreme memory requirements, such as in-memory databases and real-time analytics.

### M1 Series

M1 instances support up to 160 vCPUs and up to 3.75 TB of memory. M1 is suitable for SAP HANA deployments, large in-memory databases, and analytics workloads that fit entirely in RAM.

### M2 Series

M2 supports up to 416 vCPUs and up to 11.75 TB of memory, making it the largest memory configuration available on Compute Engine standard families. M2 is certified for SAP HANA workloads up to 12 TB.

### M3 Series

M3 is the most recent memory optimized family, built on Intel Ice Lake. M3 supports up to 128 vCPUs and up to 3.9 TB of memory, with improved price performance relative to M1 for many SAP workloads.

## Accelerator Optimized Machine Families

Accelerator optimized families bundle GPUs or TPUs into the machine type and are designed for AI training, inference, and other accelerated workloads.

### A2 Series

A2 instances are attached to NVIDIA A100 GPUs, available in configurations from 1 to 16 GPUs per instance. The largest A2 instance offers 96 vCPUs, 1.36 TB of memory, and 16 A100 GPUs with NVLink interconnect.

A2 is the workhorse family for distributed training of large models and high throughput inference. As of mid 2024, A2 is available in 16 regions.

### G2 Series

G2 instances are attached to NVIDIA L4 GPUs and offer up to 8 GPUs per instance with up to 96 vCPUs and 432 GB of memory. G2 targets inference workloads, graphics rendering, and video transcoding.

## Choosing a Family

Architects should begin by identifying the dominant resource for the workload. CPU bound workloads belong on C2 or C2D. Memory bound workloads belong on M series. GPU workloads belong on A2 or G2. Everything else should start on N2 or N2D and move to E2 only if cost optimization is a stronger requirement than performance consistency.

When in doubt, the recommendation engine in the Google Cloud console can analyze actual utilization metrics from past workloads and propose more cost effective machine types. This tool should be revisited at least monthly for production fleets to capture the impact of new family launches.
