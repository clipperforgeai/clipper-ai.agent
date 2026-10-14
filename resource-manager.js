/**
 * AI CLIPPER AGENT V5.5 - RESOURCE MANAGER & MEMORY GUARD
 */
class SmartResourceManager {
  static getSpecs() {
    const logicalCores = navigator.hardwareConcurrency || 2;
    const devMem = navigator.deviceMemory || 2;
    const perfMem = (window.performance && performance.memory) ? performance.memory.jsHeapSizeLimit : null;

    let totalRAMMB = devMem * 1024;
    if (perfMem) {
      totalRAMMB = Math.min(totalRAMMB, Math.floor(perfMem / (1024 * 1024)));
    }

    let tier = 'medium';
    let maxWorkers = 2;

    if (logicalCores <= 2 || devMem <= 2) {
      tier = 'low';
      maxWorkers = 1;
    } else if (logicalCores >= 6 && devMem >= 6) {
      tier = 'high';
      maxWorkers = 4;
    }

    return { logicalCores, devMem, totalRAMMB, tier, maxWorkers };
  }

  static evaluateWorkload(videoFile) {
    const specs = this.getSpecs();
    const fileSizeMB = videoFile ? (videoFile.size / (1024 * 1024)) : 0;
    
    let isMemorySafeOn = false;
    if (fileSizeMB > 300 || specs.tier === 'low') {
      isMemorySafeOn = true;
    }

    return {
      isMemorySafeOn,
      activeWorkers: specs.maxWorkers,
      specs,
      fileSizeMB: fileSizeMB.toFixed(1)
    };
  }

  static cleanupObjectUrl(url) {
    if (url && typeof url === 'string' && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.warn('Object URL cleanup failed:', e);
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.SmartResourceManager = SmartResourceManager;
  window.MemoryGuard = SmartResourceManager;
}
