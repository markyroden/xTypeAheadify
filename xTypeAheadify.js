/*input format is 

$("#selectFields").xTypeAheadify(
	continueAfterFail : true/false,
	failIcon : "x.png",
	waitingIcon : "treeExpand_loading.gif"
	visualTimeout : 2000, 
	toolTipMsg : "Please select from the list",
	toolTipPosition : "['above', 'before']" //"above", "below", "after", "before"
*/

// keep all your code in a closure
(function($)
{
    // name your plugin - try to make it unique
    $.fn.xTypeAheadify = function(option, settings)
    {
        // check if user is setting/getting properties manually after plugin creation
        if(typeof option === 'object')
        {
            settings = option;
        }
        else if(typeof option === 'string')
        {
            var data = this.data('_xTypeAheadify');

            // this will check if plugin has already been initialized for this element
            if(data)
            {
                if($.fn.xTypeAheadify.defaultSettings[option] !== undefined)
                {
                	if(settings !== undefined){
						//if you need to make any specific changes to the DOM make them here
						data.settings[option] = settings;
						return true;
					}
					else return data.settings[option];
				}
			}
            else return false;
        }

        // extend user settings with default settings
        settings = $.extend({}, $.fn.xTypeAheadify.defaultSettings, settings || {});
 
        //Create the tooltip to be displayed on failure
        var showTool = settings.toolTipMsg
        dojo.require("dijit.Tooltip");
        	
        if (showTool!=""){
        	showTool = new dijit.Tooltip({
        		label: showTool,
        		position: settings.toolTipPosition
        	});			
        }	
        
        //Hijack the xpages typeAhead dojo code and intercept the returned xhr call
        dojo.addOnLoad( function(){
	 		
 		   /*** hijacking xhr request ***/
 		   if( !dojo._xhr )
 		      dojo._xhr = dojo.xhr;
 		 
 		   dojo.xhr = function(event){
 		      try{
 		         var args = arguments[1];
 		         if( args['content'] ){
 		            var content = args['content'];
 		               if( content['$$ajaxmode'] ){
 		                  if( content['$$ajaxmode'] == "typeahead" ){
 		                 
 		                     /*** hook in load function ***/
 		                     typeAheadLoad = args["load"];
 		 
 		                     /*** overwrite error function ***/
 		                  //   args["error"] = function(){
 		                   //     alert('Error raised!')
 		                  //   };
 		                     
 		                     /*** hijack load function ***/
 		                     args["load"] = function(arguments){
 		                        /*** On Start ***/
 		                     
 		                        /*** call original function ***/
 		                        typeAheadLoad(arguments);
 		                        /*** On Complete ***/
 		                 	   if (arguments.toLowerCase()=="<ul></ul>"){

 		                 		   //get the field the user is typing in
		                 		   	var taField = x$(content['$$ajaxid']).next("DIV")
		                 		   		.find('.iAmTypeAhead')
 		                 		   
		                 		   	//excludes errors for typeAheads which have not been selected
		                 		   	if (taField.val()){	
	 		                 		   //get the failIcon from the parameters
	 		                 		   	var failImage="url("+settings.failIcon+")"
	
	 		                 		   	//get the span to display fail
	 		                 		   	var failSpan = x$(content['$$ajaxid']).next("DIV")
	 		                 		   		.find('.dijitValidationIcon')
	 		                 		   		
	 		                 		   	//Set the background and show it	
	 		                 		   	failSpan.css('background-image', failImage)
	 		                 		   		.css('visibility', 'visible')
	 		                 		   
	 		                     		//Check to see if continue typing is appropriate
	 		                     		if (!settings.continueAfterFail){
	 										taField.attr('data-passtype', taField.val().length)
	 		                     		}
										if (showTool!="") {showTool.open(taField[0])}
		                 		   	}
 								} else {
 									//we have hit results - therefore remove the waiting icon and/or tooltip
 									removeVisual(idTag, showTool)
 								}
 		                     };
 		                 }
 		             }
 		         }
 		      }catch(e){}
 		      dojo._xhr( arguments[0], arguments[1], arguments[2] );
 		   }
 		});

        
        // iterate through all elements and return them to maintain jQuery method chaining
        return this.each( function(index)
        {
        	var elem = $(this);

            // create copy of settings object allowing us to make individual adjustments
            // this ensures that only values for current element are changed
            var $settings = jQuery.extend(true, {}, settings);

            // create a refreshing object
            var xTA = new XTypeAhead($settings, elem.attr('id'));
            elem.addClass("iAmTypeAhead")
            //get the idTag of the SPAN which is used in tracking via the $$ajaxid
            var sidTag = elem.parent('div').parent('div').prevAll('SPAN:first').attr('id')
            elem.attr('xTA-idTag', sidTag)

            // Bind the custom events to the typeAhead field
        	//debugger;
            xTA.addOnBlur(showTool)
            xTA.addKeyDown()
            xTA.addKeyUp(showTool)
            xTA.addOnChange(showTool)
            
            // store the tooltip object for later reference - setters/getters
            elem.data('_xTypeAheadify', xTA);
        });
    }

    	// default settings if none are passed in when teh plugin is called
        $.fn.xTypeAheadify.defaultSettings = {
        		continueAfterFail : false,
        		failIcon : "x.png",
        		waitingIcon : "treeExpand_loading.gif",
        		visualTimeout : 5000, 
        		toolTipMsg : "Please select from the list",
        		tooTipPosition : "['above', 'before']" //"above", "below", "after", "before"
            };
	
    // create our XTypeAhead "class"
    function XTypeAhead(settings, idTag)
    {
        this.xTA = null;
        this.idTag=idTag;
        this.settings = settings;

        return this;
    }	
    
	
    // prototype the XTypeAhead class
    // this will contain methods shared amongst all typeAhead fields
    XTypeAhead.prototype = 
    {
            addOnBlur: function(showTool)
            {
    			//when the user clicks out of the field the waiting icon and tooltip are removed
    			idTag=this.idTag
                x$(idTag).on('blur', function(elem, index){
                	removeVisual(idTag, showTool);
                })	            	
            },
            addOnChange: function(showTool)
            {
            	//this sets up the trigger so that when the option presented by the 
            	//typeAhead is selected, the waiting icon is removed
    			idTag=this.idTag
    			//the event must be unique and because we know idTag is
    			//We have our unique event name
    			XSP.attachEvent("event"+idTag, idTag, "onchange",
                        function() { removeVisual(idTag, showTool)}, false, 2);
            },
            addKeyUp: function(showTool)
            {
    			//when the user clicks out of the field the waiting icon and tooltip are removed
    			idTag=this.idTag
                x$(idTag).on('keyup', function(elem, index){
                	if (x$(idTag).val().length == 0){
                		removeVisual(idTag, showTool);               		
                	}
                })	            	
            },
            addKeyDown: function(){
            	//This set sup the trigger so that when a key is pressed in a field
            	//The waiting icon is displayed and a check is done to see
            	//if the parameters allow users to continue to type after a fail
            	var showWaiting = false
            	idTag=this.idTag
            	settings=this.settings
            	x$(idTag).on('keydown', function(e){
            		
            		idTag = e.target.getAttribute("id")
            		//check to see if continued typing is allowed
            		var addChar = true;
            		var pt=x$(idTag).attr("data-passtype")
              		if (pt!=null && pt!=""){
            			addChar =  false;
            		}

         		   	//If we do not allow further typing then
         		   	var keyCode = (e.which) ? e.which : e.keyCode;
        			if (!addChar){
        				//we have to let the user delete - otherwise no more typing
        				//or if they highlighted and hit another key we just need to make sure it 
        				//is less than the passtype 
        				if ((keyCode != 8) && (keyCode != 46) && (keyCode <37 || keyCode >40)){
        					e.preventDefault()		
        				} else {
        					//release the flag for no more typing
        					x$(idTag).attr("data-passtype", "")
        					showWaiting = true
        				}
        			} else {
        				//get the span to display fail
                		//set the CSS values and remove the default X from the field
             		   	showWaiting = true
    	 		        
             		   	//display the parent
             		   	x$("widget_"+idTag +" .dijitValidationContainer").css("display", "block")
             		   	
        			}
        			
        			if (showWaiting) {
        				var waitingIcon = x$("widget_"+idTag+" .dijitValidationIcon")
         		   		.css({
         		   				'background-image': "url("+settings.waitingIcon+")", 
         		   				'visibility': 'visible'
         		   			})
         		   		.attr("value", "")        				
   	        			//set the icon to remove after the visualTimeout delay
   	        			var fail = setTimeout('checkTimer(idTag)', settings.visualTimeout);
        			}
                });

            }
    }
})(jQuery);

//The following functions support the plugin but are not part of itself

//x$ function used to convert input string input a selector for jQuery or dojo
//expected input string similar to view1_:id1_:viewPanel1
function x$(idTag, param){
	idTag=idTag.replace(/:/gi, "\\:")+(param ? param : "");
	return($("#"+idTag));
}
	
function checkTimer(idTag){
		//
	   	x$("widget_"+idTag +" .dijitValidationContainer").css("display", "block")
}

function removeVisual(idTag, showTool){
	
	//hide the visual indicator
   	var waitingIcon = x$("widget_"+idTag+" .dijitValidationIcon").css({
   		'background-image': "", 
   		'visibility': 'hidden'
   	})
    //hide parent
   	x$("widget_"+idTag +" .dijitValidationContainer").css("display", "none")	
   	
	//remove the tooltip if it exists
	if (!showTool.length){
		showTool.destroy(true)
	}
}
