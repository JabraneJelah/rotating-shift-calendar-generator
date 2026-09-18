declare module "tzdata" {
  type TimeZoneData = {
    readonly version: string;
    readonly zones: Readonly<Record<string, unknown>>;
    readonly rules: Readonly<Record<string, unknown>>;
  };

  const data: TimeZoneData;
  export default data;
}
