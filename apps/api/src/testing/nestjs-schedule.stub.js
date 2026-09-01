// Jest-only CJS stub for @nestjs/schedule@12;
// The real package ships ESM-only ('type': 'module'), which the CJS jest
// runtime cannot load; Unit tests only need the DI class tokens, so this
// stub is mapped over the real package via jest moduleNameMapper;
class SchedulerRegistry {
  addCronJob() {}
  getCronJob() {}
  deleteCronJob() {}
  doesExist() {
    return false;
  }
}

class ScheduleModule {
  static forRoot() {
    return { module: ScheduleModule, providers: [], exports: [] };
  }
}

module.exports = { SchedulerRegistry, ScheduleModule };
