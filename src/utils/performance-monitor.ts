/**
 * Performance Monitor for the Kwisatz-Haderach Citation Intelligence Framework
 */

import { Logger } from './logging.js';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private readonly logger: Logger;
  private metrics: PerformanceMetric[] = [];
  private activeMetrics = new Map<string, PerformanceMetric>();

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  public startMeasurement(name: string, metadata?: Record<string, unknown>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    };
    
    this.activeMetrics.set(name, metric);
  }

  public endMeasurement(name: string): number | null {
    const metric = this.activeMetrics.get(name);
    if (!metric) {
      this.logger.warn(`Performance measurement '${name}' not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;
    
    this.metrics.push(metric);
    this.activeMetrics.delete(name);
    
    this.logger.performance(name, duration, metric.metadata);
    
    return duration;
  }

  public recordActivationTime(time: number): void {
    this.logger.performance('Extension Activation', time);
  }

  public recordWorkflowExecution(time: number, qualityScore: number): void {
    this.logger.performance('Workflow Execution', time, { qualityScore });
  }

  public getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  public clearMetrics(): void {
    this.metrics = [];
    this.activeMetrics.clear();
  }
}
