var Spooky = require('spooky');
var sleep = require('sleep');

var loginUserName = '';
var loginPassword = '';
var paymentPassword = [];
var activityId = 18; // Badminton
var venueId = 296; // Clementi sports hall
var bookingTime = ['15:00:00;16:00:00', '16:00:00;17:00:00'];
var lookAhead = 15;

var spooky = new Spooky({
  child: {
    transport: 'http',
    "ssl-protocol": "tlsv1",
    "ignore-ssl-errors": true
  },
  casper: {
    logLevel: 'debug',
    verbose: true,
    pageSettings: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.130 Safari/537.36'
    }
  }
}, function (err) {
  if (err) {
    e = new Error('Failed to initialize SpookyJS');
    e.details = err;
    throw e;
  }

  // Login
  spooky.start('https://members.myactivesg.com/auth', [{
    loginUserName: loginUserName,
    loginPassword: loginPassword
  }, function() {
    this.fill('#formSignin', {
      email: loginUserName,
      password: loginPassword
    }, false);

    this.click('#btn-submit-login');

    this.emit('log', 'Form submitted');
  }]);

  // Go to facility booking page
  spooky.waitFor(function() {
    return this.getCurrentUrl().indexOf('https://members.myactivesg.com/profile') === 0;
  }, function() {
    this.emit('log', '[Active SG] Logged in. URL: ' + this.getCurrentUrl());
    this.click('.snap-top-btn-wrapper a[href="https://members.myactivesg.com/facilities"]');
    this.emit('log', '[Active SG] Go to facility booking page.');
  }, function() {
    this.emit('log', '[Active SG] Time out when login.');
  }, 30000);

  // Choose facility
  spooky.waitFor(function() {
    return this.getCurrentUrl().indexOf('https://members.myactivesg.com/facilities') === 0;
  }, [{
    activityId: activityId,
    venueId: venueId,
    lookAhead: lookAhead
  }, function() {
    this.emit('log', '[Active SG] Facility booking page is displayed.');

    var convertDateToString = function(date) {
      var dateStr, dayOfWeek, month;
      switch (date.getDay()) {
        case 0:
          dayOfWeek = 'Sun';
          break;
        case 1:
          dayOfWeek = 'Mon';
          break;
        case 2:
          dayOfWeek = 'Tue';
          break;
        case 3:
          dayOfWeek = 'Wed';
          break;
        case 4:
          dayOfWeek = 'Thu';
          break;
        case 5:
          dayOfWeek = 'Fri';
          break;
        case 6:
          dayOfWeek = 'Sat';
          break;
      }

      switch (date.getMonth()) {
        case 0:
          month = 'Jan';
          break;
        case 1:
          month = 'Feb';
          break;
        case 2:
          month = 'Mar';
          break;
        case 3:
          month = 'Apr';
          break;
        case 4:
          month = 'May';
          break;
        case 5:
          month = 'Jun';
          break;
        case 6:
          month = 'Jul';
          break;
        case 7:
          month = 'Aug';
          break;
        case 8:
          month = 'Sep';
          break;
        case 9:
          month = 'Oct';
          break;
        case 10:
          month = 'Nov';
          break;
        case 11:
          month = 'Dec';
          break;
      }

      dateStr = dayOfWeek + ', ' + date.getDate() + ' ' + month + ' ' + date.getFullYear();
      return dateStr;
    };

    var bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + lookAhead);
    var bookingDayOfWeek = bookingDate.getDay();
    if (bookingDayOfWeek === 0) {
      bookingDayOfWeek = 7;
    }
    var bookingDateStr = convertDateToString(bookingDate);

    this.fill('#formFacFilter', {
      activity_filter: activityId,
      venue_filter: venueId,
      day_filter: bookingDayOfWeek,
      date_filter: bookingDateStr
    }, true);

    this.emit('log', '[Active SG] Facility & date submitted.');
  }], function() {
    this.emit('log', '[Active SG] Time out when displaying facility booking page.');
  }, 30000);

  // Choose court
  spooky.waitFor(function() {
    return this.getCurrentUrl().indexOf('https://members.myactivesg.com/facilities/view/activity/') === 0;
  }, [{
    sleep: sleep,
    bookingTime: bookingTime
  }, function() {
    this.emit('log', '[Active SG] Courts selecting page is displayed.');

    while (!this.exists('.fac-court-name')) {
      this.emit('log', '[Active SG] Courts not ready. Sleep for a while and refresh.');
      sleep.sleep(1000);
      this.reload();
    }

    // Courts are ready now. Select courts.
    this.emit('log', '[Active SG] Courts ready.');
    var courtSlots = this.evaluate(function(bookingTime) {
      var courts = document.querySelectorAll('.subvenue-slot'),
          totalRequiredSlot = bookingTime.length,
          availableSlots, i, j, k, matchedSlots;
      for (i = 0; i < courts.length; i++) {
        matchedSlots = [];
        availableSlots = courts[i].querySelectorAll('input[name="timeslots[]"]');
        for (j = 0; j < availableSlots.length; j++) {
          for (k = 0; k < totalRequiredSlot; k++) {
            if (availableSlots[j].value.indexOf(bookingTime[k]) > 0) {
              matchedSlots.push(availableSlots[j].value);
              break;
            }
          }
          if (matchedSlots.length == totalRequiredSlot) {
            return {court: i, slots: matchedSlots};
          }
        }
      }

      return null;
    }, bookingTime);

    if (courtSlots) {
      this.emit('log', '[Active SG] Court: ' + courtSlots.court + '. Slots: ' + courtSlots.slots);
      for (var i = 0; i < courtSlots.slots.length; i++) {
        this.click('input[value="' + courtSlots.slots[i] + '"]');
      }
      this.click('#paynow');

      this.waitForResource(function(resource) {
        return resource.url.indexOf("/facilities/processStandardBooking") != -1
      }, function() {
        this.emit('log', '[Active SG] Courts added to shopping cart.');
      });
    } else {
      this.emit('log', '[Active SG] No courts are not available.');
    }
  }], function() {
    this.emit('log', '[Active SG] Time out when displaying courts selection page.');
  }, 30000);

  spooky.waitFor(function() {
    return this.getCurrentUrl().indexOf('https://members.myactivesg.com/cart') === 0;
  }, [{
    paymentPassword: paymentPassword
  }, function() {
    this.click('input[value="ewallet"]');
    var paymentPasswordData = {};
    paymentPassword.forEach(function(element, index) {
      paymentPasswordData['.wallet-password:nth-child(' + index + ')'] = paymentPassword[index];
    });
    this.fillSelectors('#formCartPayment', paymentPasswordData, false);
    this.click('input[name="pay"]');

    this.emit('log', '[Active SG] Payment done.');
  }], function () {
    this.emit('log', '[Active SG] Time out when displaying shopping cart page.');
  });

  spooky.run();
});

spooky.on('error', function (e, stack) {
  console.error(e);

  if (stack) {
    console.log(stack);
  }
});


 // Uncomment this block to see all of the things Casper has to say.
 // There are a lot.
 // He has opinions.
 spooky.on('console', function (line) {
 console.log(line);
 });


spooky.on('log', function (greeting) {
  console.log(greeting);
});


