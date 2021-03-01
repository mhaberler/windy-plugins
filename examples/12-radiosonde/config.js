module.exports = {
	displayName: 'Radiosonde',
	hook: 'contextmenu',
   	className:  'plugin-lhpane',
    classNameMobile:     'plugin-mobile-bottom-slide'

    //use the default mobile class:
   // 'plugin-mobile-fullscreen'

    //or create your own:
    //'plugin-dragdemo-mobile'

    ,dependencies: [

        "https://d3js.org/d3.v5.min.js",
        "https://unpkg.com/skewt-plus/dist/bundle.js"

        //'https://unpkg.com/windyplugin-module-infobox@0.0.8/dist/infobox.js'
        //'https://unpkg.com/windyplugin-module-pickertools@0.1.0/dist/pickerTools.js',
        //'https://www.flymap.co.za/windypicker/pickerTools2.js?'+Math.random()

    ],
    exclusive: 'lhpane',
}
