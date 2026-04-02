// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  //api_Url: "http://localhost:8083/mis-productos"
  //api_Url: 'https://71bfb71f-e8f3-403b-bb8d-1f490a8d38bf.cfargotunnel.com/mis-productos'
  api_Url: 'http://localhost:9091/mis-productos',
  api_imagenes: 'http://localhost:9096/mis-productos'

};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
