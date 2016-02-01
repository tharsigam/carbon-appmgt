$(function () {

    var SUBSCRIPTION_TYPE_INDIVIDUAL = "INDIVIDUAL";
    var SUBSCRIPTION_TYPE_ENTERPRISE = "ENTERPRISE";

    var APP_NAME_FIELD = '#subsAppName';
    var TIER_FIELD = '#subsAppTier';
    var API_URL = caramel.context + '/resources/webapp/v1/subscription/app';
    var API_UNSUBSCRIPTION_URL = caramel.context + '/resources/webapp/v1/unsubscription/app';
    var API_SUBSCRIPTION_WORKFLOW = caramel.context + '/resources/webapp/v1/subscription-workflow/app';

    $('#btnSubscribe').on('click', function () {
        if ($(this).attr("disabled") != 'disabled') {
            $(this).attr("disabled", true);
            getAppDetails();
        } else {
            location.reload();
        }

    });

    // TODO : This code silently fails when enterprise subscriptions are not allowed. Handle it nicely.
    $('#btnEnterpriseSubscriptions').popover({
        html: true,
        placement: 'bottom',
        trigger: 'click',
        content: $('#enterpriseSubscriptionManagementPanel').html()
    });

    $(document).on('click', '#btnSaveEnterpriseSubscriptions', function () {
        saveEnterpriseSubscriptions();
    });

    $('#btnUnsubscribe').on('click', function () {
        removeAppDetails();
    });

    var getAppDetails = function () {

        if (metadata) {
            console.log('Found metadata');
            var appName = getAppName();
            var tier = getTier();

            //Obtain the required information.
            var subscription = {};
            var appDetails = metadata.apiAssetData.attributes;
            subscription['apiName'] = appDetails.overview_name;
            subscription['apiVersion'] = appDetails.overview_version;
            subscription['apiTier'] = tier;
            subscription['subscriptionType'] = SUBSCRIPTION_TYPE_INDIVIDUAL;
            subscription['apiProvider'] = appDetails.overview_provider;
            subscription['appName'] = "DefaultApplication";

            subscribeToApi(subscription);
        }
    };

    var saveEnterpriseSubscriptions = function () {
        var subscribedEnterprises = getEnterpriseSubscriptionsFromUI();
        doSaveEnterpriseSubscriptions(subscribedEnterprises);
    }

    var getEnterpriseSubscriptionsFromUI = function () {

        var subscribedEnterprises = new Array();

        $('.popover-content .enterprise-entry').each(function (index) {
            var checkbox = $(this).find("input:checkbox");
            var isSubscribed = $(this).find("input:checkbox")[0].checked;

            if (isSubscribed) {
                var enterpriseName = $(this).text();
                subscribedEnterprises.push(enterpriseName);
            }
        });

        return subscribedEnterprises;
    };

    var doSaveEnterpriseSubscriptions = function (subscribedEnterprises) {

        if (metadata) {
            var subscription = {};
            var appDetails = metadata.apiAssetData.attributes;
            subscription['apiName'] = appDetails.overview_name;
            subscription['apiVersion'] = appDetails.overview_version;
            subscription['apiTier'] = getTier();
            subscription['subscriptionType'] = SUBSCRIPTION_TYPE_ENTERPRISE;
            subscription['apiProvider'] = appDetails.overview_provider;
            subscription['appName'] = "DefaultApplication";
            subscription['enterprises'] = JSON.stringify(subscribedEnterprises);
            subscribeToApi(subscription);
        }
    };

    var removeAppDetails = function () {

        if (metadata) {
            var appName = getAppName();
            var tier = getTier();
            //Obtain the required information.
            var subscription = {};
            var appDetails = metadata.apiAssetData.attributes;
            subscription['apiName'] = appDetails.overview_name;
            subscription['apiVersion'] = appDetails.overview_version;
            subscription['apiTier'] = tier;
            subscription['apiProvider'] = appDetails.overview_provider;
            subscription['appName'] = "DefaultApplication";

            unsubscribeToApi(subscription);
        }
    };

    var getAppName = function () {
        return $(APP_NAME_FIELD) ? $(APP_NAME_FIELD).val() : '';
    };

    var getTier = function () {
        return $(TIER_FIELD) ? $(TIER_FIELD).val() : '';
    };

    /*
     The method invokes the API call which will subscribe the provided application to the given app.
     */
    var subscribeToApi = function (subscription) {
        $.ajax({
            url: APP_URL,
            dataType: 'JSON',
            type: 'POST',
            data: subscription,
            complete: function (response, textStatus) {
                if (textStatus == "success") {
                    console.info('Successfully subscribed to Web app: ' + subscription.apiName);

                    // Update UI based on the subscription type.
                    if (subscription['subscriptionType'] == "INDIVIDUAL") {

                        noty({
                            text: 'You have successfully subscribed to the <b>' + subscription.apiName + '</b>',
                            'layout': 'center',
                            'timeout': 1500,
                            'modal': true,
                            'onClose': function () {
                                location.reload();
                            }
                        });

                    } else if (subscription['subscriptionType'] == "ENTERPRISE") {
                        updateUIAfterEnterpriseSubscription(subscription);
                    }
                } else {
                    alert("response error true")
                    console.info('Error occured in subscribe to web app: ' + subscription.apiName);
                }
            },
            error: function (response) {
                alert('Error occured in subscribe');

            },
            success: function (e) {
            }
        });
    };

    var showIndividualSubscriptionSuccessfulMessage = function (apiName) {
        $.ajax({
            url: APP_SUBSCRIPTION_WORKFLOW,
            type: 'POST',
            success: function (response) {
                if (response.status == false) {
                    showIndividualSubscriptionMessage(false, 'Subscription Approval', 'your request to subscribe the application is awaiting administrator approval');
                } else if (response.status == true) {
                    showIndividualSubscriptionMessage(true, 'Subscription Successful', 'Congratulations! You have successfully subscribed to the ' + '<b>"' + apiName + '</b>"');
                } else {
                    console.info('Error occured in subscribe to web app: ');
                }
            },
            error: function (response) {
                alert('Error occured in subscribe');
            }
        });
    }

    var showIndividualSubscriptionMessage = function (status, messageTitle, messageBody) {

        $('#messageModal1').html($('#confirmation-data1').html());
        $('#messageModal1 h3.modal-title').html((messageTitle));
        $('#messageModal1 div.modal-body').html('\n\n' + (messageBody) + '.');
        $('#messageModal1 a.btn-other').html('OK');

        $('#messageModal1').modal();
        if (status) {
            $('#btnUnsubscribe').show();
            $('#btnSubscribe').hide();
            $('#subscribed').val(true);
        } else {
            $('#btnSubscribe').attr("disabled", true);
        }
    }

    var updateUIAfterEnterpriseSubscription = function (subscription) {

        $('#btnEnterpriseSubscriptions').popover('hide');

        var subscribedEnterprises = JSON.parse(subscription.enterprises);

        // Create a set of subscribed enterprises.
        var subscribedEnterprisesSet = {};
        for (var i = 0; i < subscribedEnterprises.length; i++) {
            subscribedEnterprisesSet[subscribedEnterprises[i]] = true;
        }

        // Iterate throgh the check boxes and update them accordingly.
        var checkboxContainer = $('#enterpriseSubscriptionManagementPanel #enterprises');
        var checkboxes = checkboxContainer.find("input[id^='checkboxEnterprise_']");

        for (var i = 0; i < checkboxes.length; i++) {
            var checkbox = checkboxes[i];

            // Update this checkbox accordingly.
            checkbox.checked = checkbox.name in subscribedEnterprisesSet

        }
    }

    var unsubscribeToApi = function (subscription) {

        $.ajax({
            url: APP_UNSUBSCRIPTION_URL,
            type: 'POST',
            data: subscription,
            success: function (response) {
                if (response.error == false) {

                    noty({
                        text: 'You have successfully unsubscribed from the <b>' + subscription.apiName + '</b>',
                        'layout': 'center',
                        'timeout': 1500,
                        'modal': true,
                        'onClose': function () {
                            location.reload();
                        }
                    });

                    $('#btnUnsubscribe').hide();
                    $('#btnSubscribe').show();
                    $('#subscribed').val(false);

                } else {
                    console.info('Error occured in unsubscribe to web app: ' + subscription.apiName);
                }
            },
            error: function (response) {
                alert('Error occured in unsubscribe');
            }
        });
    };
});
