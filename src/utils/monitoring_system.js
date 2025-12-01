const { Logger } = require('./enhanced_logger');
const ssoConfig = require('../config/sso_config');

class MonitoringSystem {
  constructor() {
    this.metrics = new Map();
    this.alerts = new Map();
    this.thresholds = new Map();
    this.healthChecks = new Map();
    this.initializeDefaultThresholds();
    this.startMonitoring();
  }

  initializeDefaultThresholds() {
    // Performance thresholds
    this.thresholds.set('response_time', {
      warning: 1000, // 1 second
      critical: 5000, // 5 seconds
      type: 'max'
    });

    this.thresholds.set('error_rate', {
      warning: 0.05, // 5%
      critical: 0.1, // 10%
      type: 'percentage'
    });

    this.thresholds.set('memory_usage', {
      warning: 0.8, // 80%
      critical: 0.9, // 90%
      type: 'percentage'
    });

    this.thresholds.set('cpu_usage', {
      warning: 0.8, // 80%
      critical: 0.9, // 90%
      type: 'percentage'
    });

    // SSO specific thresholds
    this.thresholds.set('login_failure_rate', {
      warning: 0.1, // 10%
      critical: 0.2, // 20%
      type: 'percentage'
    });

    this.thresholds.set('token_expiry_rate', {
      warning: 0.05, // 5%
      critical: 0.1, // 10%
      type: 'percentage'
    });

    this.thresholds.set('rate_limit_hits', {
      warning: 100, // per hour
      critical: 500, // per hour
      type: 'count'
    });

    this.thresholds.set('active_sessions', {
      warning: 1000,
      critical: 2000,
      type: 'count'
    });
  }

  startMonitoring() {
    if (!ssoConfig.sso.monitoring.enableMetrics) {
      return;
    }

    // System metrics collection
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Every 30 seconds

    // Health checks
    setInterval(() => {
      this.runHealthChecks();
    }, ssoConfig.sso.monitoring.healthCheckInterval);

    // Alert processing
    setInterval(() => {
      this.processAlerts();
    }, 60000); // Every minute

    Logger.info('Monitoring system started', {
      metricsEnabled: ssoConfig.sso.monitoring.enableMetrics,
      healthCheckInterval: ssoConfig.sso.monitoring.healthCheckInterval
    });
  }

  // Metrics collection
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.recordMetric('system.memory.used', memUsage.heapUsed);
    this.recordMetric('system.memory.total', memUsage.heapTotal);
    this.recordMetric('system.memory.external', memUsage.external);
    this.recordMetric('system.memory.rss', memUsage.rss);

    this.recordMetric('system.cpu.user', cpuUsage.user);
    this.recordMetric('system.cpu.system', cpuUsage.system);

    this.recordMetric('system.uptime', process.uptime());
    this.recordMetric('system.pid', process.pid);

    // Calculate percentages
    const memUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
    this.recordMetric('system.memory.usage_percent', memUsagePercent);

    Logger.metricsGauge('system.memory.usage_percent', memUsagePercent);
    Logger.metricsGauge('system.uptime', process.uptime());
  }

  recordMetric(name, value, tags = {}) {
    const timestamp = Date.now();
    const metric = {
      name,
      value,
      tags,
      timestamp
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricHistory = this.metrics.get(name);
    metricHistory.push(metric);

    // Keep only last 1000 entries per metric
    if (metricHistory.length > 1000) {
      metricHistory.shift();
    }

    // Check thresholds
    this.checkThresholds(name, value, tags);
  }

  recordCounter(name, increment = 1, tags = {}) {
    const current = this.getMetricValue(name, tags) || 0;
    this.recordMetric(name, current + increment, tags);
  }

  recordTimer(name, duration, tags = {}) {
    this.recordMetric(name, duration, tags);
    this.recordMetric(`${name}.count`, 1, tags);
  }

  getMetricValue(name, tags = {}) {
    const metricHistory = this.metrics.get(name);
    if (!metricHistory || metricHistory.length === 0) {
      return null;
    }

    // Filter by tags if provided
    const filtered = metricHistory.filter(m => 
      Object.keys(tags).every(key => m.tags[key] === tags[key])
    );

    if (filtered.length === 0) {
      return null;
    }

    // Return latest value
    return filtered[filtered.length - 1].value;
  }

  getMetricStats(name, timeWindow = 3600000) { // 1 hour default
    const metricHistory = this.metrics.get(name);
    if (!metricHistory || metricHistory.length === 0) {
      return null;
    }

    const now = Date.now();
    const cutoff = now - timeWindow;
    const recent = metricHistory.filter(m => m.timestamp > cutoff);

    if (recent.length === 0) {
      return null;
    }

    const values = recent.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      count: recent.length,
      sum,
      avg,
      min,
      max,
      latest: values[values.length - 1]
    };
  }

  // Threshold checking
  checkThresholds(metricName, value, tags = {}) {
    const threshold = this.thresholds.get(metricName);
    if (!threshold) {
      return;
    }

    let alertLevel = null;
    let thresholdValue = null;

    if (threshold.type === 'max') {
      if (value >= threshold.critical) {
        alertLevel = 'critical';
        thresholdValue = threshold.critical;
      } else if (value >= threshold.warning) {
        alertLevel = 'warning';
        thresholdValue = threshold.warning;
      }
    } else if (threshold.type === 'percentage') {
      if (value >= threshold.critical) {
        alertLevel = 'critical';
        thresholdValue = threshold.critical;
      } else if (value >= threshold.warning) {
        alertLevel = 'warning';
        thresholdValue = threshold.warning;
      }
    } else if (threshold.type === 'count') {
      // For count metrics, check rate over time window
      const stats = this.getMetricStats(metricName, 3600000); // 1 hour
      if (stats) {
        const rate = stats.count / 3600; // per second
        if (rate >= threshold.critical) {
          alertLevel = 'critical';
          thresholdValue = threshold.critical;
        } else if (rate >= threshold.warning) {
          alertLevel = 'warning';
          thresholdValue = threshold.warning;
        }
      }
    }

    if (alertLevel) {
      this.triggerAlert(metricName, alertLevel, value, thresholdValue, tags);
    }
  }

  // Alerting system
  triggerAlert(metricName, level, value, threshold, tags = {}) {
    const alertKey = `${metricName}:${level}`;
    const now = Date.now();
    
    // Check if alert was already triggered recently (prevent spam)
    const lastAlert = this.alerts.get(alertKey);
    if (lastAlert && (now - lastAlert.timestamp) < 300000) { // 5 minutes cooldown
      return;
    }

    const alert = {
      metricName,
      level,
      value,
      threshold,
      tags,
      timestamp: now,
      message: `${metricName} threshold exceeded: ${value} >= ${threshold} (${level})`
    };

    this.alerts.set(alertKey, alert);

    // Log alert
    Logger.logSecurityEvent('THRESHOLD_ALERT', level, {
      metric: metricName,
      value,
      threshold,
      tags
    });

    // Send notification (implement based on your notification system)
    this.sendNotification(alert);
  }

  sendNotification(alert) {
    // Implement notification logic here
    // This could be email, Slack, PagerDuty, etc.
    
    Logger.warn('Alert triggered', {
      alert: alert.message,
      level: alert.level,
      metric: alert.metricName,
      value: alert.value,
      threshold: alert.threshold
    });

    // Example: Send to external monitoring service
    if (ssoConfig.sso.monitoring.enableMetrics) {
      Logger.metricsCounter('alerts.triggered', 1, {
        level: alert.level,
        metric: alert.metricName
      });
    }
  }

  // Health checks
  registerHealthCheck(name, checkFunction, interval = 60000) {
    this.healthChecks.set(name, {
      checkFunction,
      interval,
      lastCheck: null,
      lastResult: null,
      consecutiveFailures: 0
    });
  }

  async runHealthChecks() {
    for (const [name, healthCheck] of this.healthChecks.entries()) {
      try {
        const result = await healthCheck.checkFunction();
        const now = Date.now();
        
        healthCheck.lastCheck = now;
        healthCheck.lastResult = result;
        
        if (result.healthy) {
          healthCheck.consecutiveFailures = 0;
        } else {
          healthCheck.consecutiveFailures++;
          
          if (healthCheck.consecutiveFailures >= 3) {
            this.triggerAlert('health_check', 'critical', healthCheck.consecutiveFailures, 3, {
              check: name,
              error: result.error
            });
          }
        }

        this.recordMetric('health_check.status', result.healthy ? 1 : 0, { check: name });
        
      } catch (error) {
        Logger.error('Health check failed', {
          check: name,
          error: error.message
        });
        
        healthCheck.consecutiveFailures++;
        this.recordMetric('health_check.error', 1, { check: name });
      }
    }
  }

  // Built-in health checks
  initializeHealthChecks() {
    // Database health check
    this.registerHealthCheck('database', async () => {
      // Implement database connectivity check
      return { healthy: true, responseTime: 10 };
    });

    // Memory health check
    this.registerHealthCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const usagePercent = memUsage.heapUsed / memUsage.heapTotal;
      return {
        healthy: usagePercent < 0.9,
        usagePercent,
        error: usagePercent >= 0.9 ? 'High memory usage' : null
      };
    });

    // SSO service health check
    this.registerHealthCheck('sso_service', async () => {
      // Check if SSO endpoints are responding
      return { healthy: true, responseTime: 50 };
    });
  }

  // Alert processing
  processAlerts() {
    const now = Date.now();
    const alertsToProcess = [];

    for (const [key, alert] of this.alerts.entries()) {
      // Process alerts older than 1 hour
      if (now - alert.timestamp > 3600000) {
        alertsToProcess.push(key);
      }
    }

    // Remove old alerts
    alertsToProcess.forEach(key => this.alerts.delete(key));

    // Log alert summary
    if (this.alerts.size > 0) {
      Logger.info('Active alerts', {
        count: this.alerts.size,
        alerts: Array.from(this.alerts.values()).map(a => ({
          metric: a.metricName,
          level: a.level,
          message: a.message
        }))
      });
    }
  }

  // Get monitoring dashboard data
  getDashboardData() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    return {
      metrics: {
        system: {
          memory: this.getMetricStats('system.memory.usage_percent'),
          uptime: this.getMetricValue('system.uptime'),
          cpu: this.getMetricStats('system.cpu.user')
        },
        sso: {
          activeSessions: this.getMetricValue('sso.active_sessions'),
          loginFailures: this.getMetricStats('sso.login.failures', oneHourAgo),
          tokenExchanges: this.getMetricStats('sso.token.exchanges', oneHourAgo),
          rateLimitHits: this.getMetricStats('sso.rate_limit.hits', oneHourAgo)
        }
      },
      alerts: Array.from(this.alerts.values()),
      healthChecks: Array.from(this.healthChecks.entries()).map(([name, check]) => ({
        name,
        lastCheck: check.lastCheck,
        healthy: check.lastResult?.healthy,
        consecutiveFailures: check.consecutiveFailures
      })),
      thresholds: Object.fromEntries(this.thresholds),
      timestamp: now
    };
  }

  // API endpoints
  async getMetrics(req, res) {
    try {
      const { metric, timeWindow = 3600000 } = req.query;
      
      if (metric) {
        const stats = this.getMetricStats(metric, parseInt(timeWindow));
        return res.json({ metric, stats });
      }

      const allMetrics = {};
      for (const [name] of this.metrics.entries()) {
        allMetrics[name] = this.getMetricStats(name, parseInt(timeWindow));
      }

      res.json({ metrics: allMetrics });
    } catch (error) {
      Logger.error('Error getting metrics', { error: error.message });
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  }

  async getAlerts(req, res) {
    try {
      const alerts = Array.from(this.alerts.values());
      res.json({ alerts, count: alerts.length });
    } catch (error) {
      Logger.error('Error getting alerts', { error: error.message });
      res.status(500).json({ error: 'Failed to get alerts' });
    }
  }

  async getHealth(req, res) {
    try {
      const health = {};
      for (const [name, check] of this.healthChecks.entries()) {
        health[name] = {
          healthy: check.lastResult?.healthy || false,
          lastCheck: check.lastCheck,
          consecutiveFailures: check.consecutiveFailures
        };
      }
      
      const overallHealth = Object.values(health).every(h => h.healthy);
      res.status(overallHealth ? 200 : 503).json({ health, overall: overallHealth });
    } catch (error) {
      Logger.error('Error getting health status', { error: error.message });
      res.status(500).json({ error: 'Failed to get health status' });
    }
  }
}

// Create singleton instance
const monitoringSystem = new MonitoringSystem();

module.exports = {
  MonitoringSystem,
  monitoringSystem
};
