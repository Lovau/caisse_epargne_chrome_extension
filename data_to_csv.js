function dynamicSortByDate(property) {

    return function (a,b) {
        // return b[property].localeCompare(a[property]);
        return a[property].localeCompare(b[property]);
    }
}

function formatLabel(label) {
    var result = $(label.trim()).text().trim().replace(/\s+/g,' ');
    return result.replace(/(<([^>]+)>)/gi, "");
}

function formatMontant(montant) {
    montant = montant.replace('+', '');
    montant = montant.replace(/&nbsp;/g, '');
    montant = montant.replace(/€/g, '');
    montant = montant.replace(/ /g, '');
    return montant;
}

function openPopup(JS) {
    var yourCustomJavaScriptCode = '...';
    var script = document.createElement('script');
    var code = document.createTextNode('(function() {' + JS + '})();');
    script.appendChild(code);
    (document.body || document.head).appendChild(script);
}

async function closePopup() {
    $(".detail.bottom").hide();
}

async function wait(ms) {
    await new Promise(function(res, reject) {
        setTimeout(res, ms);
    });
}

function waitForElementToExist(selector, callback) {
  if (jQuery(selector).length) {
    callback();
  } else {
    setTimeout(function() {
      waitForElementToExist(selector, callback);
    }, 50);
  }
};

async function getLabelDetails(rows) {
    var date;
    var credit;
    var debit;
    var montant;
    var label;
    var labelJS;
    var data = [];

    for (var i = 0; i < rows.length; i++) {
        date = "";
        label = "";
        labelJS = "";
        debit = 0;
        credit = 0;
        montant = 0;
        row = [];

        date = rows[i][0].substr(6,4) + "-" + rows[i][0].substr(3,2) + "-" + rows[i][0].substr(0,2);
        label = $("<div>").html(rows[i][1]).text();
        labelJS = $(rows[i][1]).attr("href").replace('javascript:', '');
        debit = $.trim(rows[i][2]);
        credit = $.trim(rows[i][3]);

        debit = formatMontant(debit);
        credit = formatMontant(credit);

        montant = debit;
        if (credit) {
            montant = credit;
        }

        openPopup(labelJS);
        console.log("Opening popup "+i);
        await wait(1200);

        await new Promise(function(resolve, reject) {

            waitForElementToExist("div.scrollPane table:visible", function(){
                var detailLabel = "";
                var detailLabelElement,detailLabelElement2,detailLabelElement3 = null;
                
                // each TR contains 2 TD
                if ($("div.scrollPane table tbody tr:first-child td").length == 2) {
                    detailLabelElement = $("div.scrollPane td:contains(Référence du donneur d'ordre) ~ td:first");
                    detailLabelElement2 = $("div.scrollPane td:contains(Information associée à l'opération) ~ td:first");
                    detailLabelElement3 = $("div.scrollPane td:contains(Libellé de l'opération) ~ td:first");

                    if (detailLabelElement.length > 0 && detailLabelElement.text().length > 0 && detailLabelElement.text() !== "NOTPROVIDED") {
                        detailLabel = detailLabelElement.text();
                    } else if (detailLabelElement2.length > 0) {
                        detailLabel = detailLabelElement2.text();
                    } else if (detailLabelElement3.length > 0) {
                        detailLabel = detailLabelElement3.text();
                    }
                } 
                // each TR contains 1 TD
                else if ($("div.scrollPane table tbody tr:first-child td").length == 1) {
                    detailLabelElement = $("div.scrollPane td:contains(Référence du donneur d'ordre)").text().replace("Référence du donneur d'ordre", "");
                    detailLabelElement2 = $("div.scrollPane td:contains(Information associée à l'opération)").text().replace("Information associée à l'opération", "");
                    detailLabelElement3 = $("div.scrollPane td:contains(Libellé de l'opération)").text().replace("Libellé de l'opération", "");

                    console.log("DEBUG", detailLabelElement, detailLabelElement2, detailLabelElement3);

                    if (detailLabelElement.length > 0 && detailLabelElement !== "NOTPROVIDED") {
                        detailLabel = detailLabelElement;
                    } else if (detailLabelElement2.length > 0) {
                        detailLabel = detailLabelElement2;
                    } else if (detailLabelElement3.length > 0) {
                        detailLabel = detailLabelElement3;
                    } else {
                    }
                    console.log("detailLabel "+i, detailLabel);

                    detailLabel = detailLabel.replace(" : ", "");
                } else {
                    console.log("EERROOORRRR");
                }

                console.log("detailLabel "+i, detailLabel);

                resolve(detailLabel);
            });
        })
        .then(function(additionalLabel) {
            if (additionalLabel.length > 0) {
                label += " / " + additionalLabel;
            }
        }).then(function() {
            console.log("RESULT", date, montant, label);
            data.push([date, montant, label]);
            closePopup();

            // return new Promise((resolve, reject) => {
            //     setTimeout(() => resolve(), 1000);
            // });
        });
    }

    data.sort(dynamicSortByDate("0"));
    console.log(data);
    return data;
}


/**
 * Convert an HTML table into javascript array 
 * 
 * @param  table DOM
 * @param  isLivret Are we on account page or livret ?
 * @return array
 */
async function getTableInJSON(table) {

    var delay = ( function() {
        var timer = 0;
        return function(callback, ms) {
            clearTimeout (timer);
            timer = setTimeout(callback, ms);
        };
    })();

    var trs = table.find('tr').get().map(function(row) {
      return $(row).find('td,th').get().map(function(cell) {
        return $(cell).html();
      });
    });

    trs.shift();
    console.log(trs);

    data = await getLabelDetails(trs);

    return data;
}

/**
 * Convert a javascript array into CSV string
 * 
 * @param  JSON
 * @return a CSV string
 */
function convertToCSV(objArray, separator = ';') {
    var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    var str = '';

    for (var i = 0; i < array.length; i++) {
        var line = '';
        for (var index in array[i]) {
            if (line != '') {
                line += separator
            }

            line += '"' + array[i][index] + '"';
        }

        str += line + '\r\n';
    }

    return str;
}

/**
 * Create a CSV file based on headers and Array of data.
 * Then download the file from browser.
 * 
 * @param  headers      Array
 * @param  items        Array
 * @param  fileTitle    String
 */
function exportCSVFile(headers, items, fileTitle) {
    if (headers) {
        items.unshift(headers);
    }

    // Convert Object to JSON
    var jsonObject = JSON.stringify(items);

    var csv = this.convertToCSV(jsonObject);

    var exportedFileName = fileTitle + '.csv' || 'export.csv';

    var blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), // UTF-8 BOM
        csv], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, exportedFileName);
    } else {
        var link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", exportedFileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}


async function startCSVDownload(e) {

    var items = $("compte-transaction-item");
    var label,date,montant,date2, month;
    var data = [];
    for (var i = 0; i < items.length; i++) {

        label = $(items[i]).find("div > div.label").text().trim();
        date = $(items[i]).find("div > div.date.ng-star-inserted").text().split('-')[0].trim();
        date2 = Date.parse(date).toString();
        // remove unecessary 3 last 0 - why ?!
        // date2 = date2.substring(0, date2.length - 2);
        // now timestamp is correct - re-convert to Date
        date2 = new Date(parseInt(date2));
        montant = $(items[i]).find("div > compte-balance > span").text().replace("€", '').replace(/\s/g,'').trim();

        items[i].click();
        label += " / " + $("compte-transaction-layer ui-cell:nth-child(1) > div > div > div > span").text().replace(/\s\s+/g, ' ').trim();

        month = date2.getMonth()+1;
        if (month < 10) {
            month = "0"+month.toString();
        }

        console.log("DEBUG", {
            date1: date,
            date2: date2.getFullYear()+"-"+month+"-"+date2.getDate(),
            montant: montant,
            label: label,
        })

        data.push({
            date: date2.getFullYear()+"-"+month+"-"+date2.getDate(),
            montant: montant,
            label: label,
        });
    }

    var csv = convertToCSV(data);
    // console.log(csv);

    var headers = ['date', 'montant', 'libelle'];

    var today = new Date();
    var filename = 'releves_compte_';
    filename += today.toISOString().substring(0, 10);

    // e.stopPropagation();
    exportCSVFile(headers, data, filename);
}
