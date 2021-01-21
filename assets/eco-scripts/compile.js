function createCompilexJson(code_cs) {
    var compilexJson = new Object();
    compilexJson.compilers_versions = $("#compilers_versions-selection-box")[0].value;
    compilexJson.codesend_selected_compiler = $("#codesend_selected_compiler")[0].value;
    compilexJson.cbx_compatible = 1;
    compilexJson.codesend = code_cs;
    compilexJson.socketID = socketCompilers.id;
    return compilexJson;
}

function compilerCall() {
    $("#codewarnerr").val("Remote compiling at " + BASE_PATH_COMPILERS + "...");
    $("#compilebtn")[0].disabled = true;
    code_cs = "";
    $("#codeavm").val("");
    $("#opcodes").val("");
    $("#codeabi").val("");
    $("#codemanifest").val("");
    $("#invokehashjs").val("");
    $("#contracthashjs").val("");
    $("#contractparams").val("\"\"");
    $("#selected_compiler_form").val(SELECTED_COMPILER);
    $('#collapseMore').collapse('hide');

    //e.preventDefault(); // Prevents the page from refreshing
    var zip = new JSZip();
    zip.file("contract", ace.edit("aceEditor").getSession().getValue());
    zip.generateAsync({
        type: "base64",
        compression: "DEFLATE",
        compressionOptions: {
            level: 9
        }
    }).then((code) => {
        if (SELECTED_COMPILER == "csharp") {
            code_cs = code;
            console.log("Compiling C# code...");
        }
        var indata = createCompilexJson(code_cs);
        console.log(indata);
        $.ajax({
                type: "POST",
                url: BASE_PATH_COMPILERS + "/compilex",
                data: indata,
                timeout: 360000, //5minutes
                dataType: "json",
                crossDomain: true
            }).done(function(data) {
                console.log("Waiting for socket response from my client: " + indata.socketID);
                $("#codewarnerr").val($("#codewarnerr").val() + "\nWaiting reply from socket connection : " + indata.socketID);
            })
            .fail(function(jqxhr, settings, ex) {
                if (jqxhr.status == 0 && jqxhr.readyState == 0) {
                    console.error("Restarting request");
                }
                swal("Failed" + ex + " Something went wrong!", {
                    icon: "error",
                    buttons: false,
                    timer: 2500,
                });
                console.log("Failed " + ex);
                console.log(ex);
                console.log(jqxhr);
                console.log(settings);
                $("#compilebtn")[0].disabled = false;
                $("#codewarnerr").val("failed" + ex + "settings " + settings + " status " + jqxhr.status + " rs " + jqxhr.readyState);
                $("#codeavm").val("failed" + ex + "settings " + settings + " status " + jqxhr.status + " rs " + jqxhr.readyState);
                $("#opcodes").val("");
            });

        //Send info to EcoServices for counting number of compilations
        $.post(
            BASE_PATH_ECOSERVICES + "/compileCounter", // Gets the URL to sent the post to
            null, // Serializes form data in standard format
            function(data) {},
            "json" // The format the response should be in
        ); //End of POST for Compile counter
    });
}

function updateCompiledOrLoadedContractInfo(contractScriptHash, avmSize) {
    $("#contractInfo_ScriptHash")[0].value = contractScriptHash;
    $("#contractInfo_Address")[0].value = toBase58(contractScriptHash);
    //TODO
    //updateScriptHashesBoxes(contractScriptHash);

    // ------------------------------------------
    // calculating extra fee according to AVM size
    var fixedAVGTxSize = 500; //TODO
    $("#contractInfo_AVMSize")[0].value = avmSize;
    // TODO - Create a call on neo-plugins SimplePolicy
    var freeSize = 1024;
    var feePerExtraByte = 0.00001;
    var extraGasNetFeeForBigTx = 0;
    // TODO Extra size workaround due to inputs lenght
    var avmWithExtraSize = avmSize + fixedAVGTxSize;
    if (avmWithExtraSize > freeSize)
        extraGasNetFeeForBigTx = (avmWithExtraSize - freeSize) * feePerExtraByte;
    $("#attachDeployGasFeeJS")[0].value = Number(String(extraGasNetFeeForBigTx).slice(0, 10));
    // ------------------------------------------
}

function setCompiler(language) {
    var vExamples;
    SELECTED_COMPILER = language;
    if (language === "csharp") {
        aceEditor.getSession().setMode("ace/mode/csharp");
        updateCompilersSelectionBox("docker-mono-neo-compiler");
        vExamples = cSharpFiles;
        //$("#cbx_example_name")[0].placeholder = "myexample.cs";
    }

    var exampleListUl = document.getElementById("ExampleList");

    exampleListUl.innerHTML = ""
    for (var e = 0; e < vExamples.length; e++) {
        var exampleToAdd = document.createElement("option");
        exampleToAdd.setAttribute('value', e);
        var onClickFunction = 'setExample("' + language + '","' + e + '");';
        exampleToAdd.setAttribute('onClick', onClickFunction)
        exampleToAdd.setAttribute('id', "loadedExample" + e);
        var cutSize = "/assets/sc_examples/" + language + "/";
        var exampleName = vExamples[e][0].slice(cutSize.length);
        var exampleInfo = "Selected code example is from " + language + ": " + exampleName;
        exampleToAdd.setAttribute('title', exampleInfo);
        exampleToAdd.appendChild(document.createTextNode(exampleName));
        exampleListUl.add(exampleToAdd);
    }

    //Checking all cookies
    USER_EXAMPLES.forEach(function(value, key) {
        addCSContractFromLocalMap(value, key, language);
    });
    if (USER_EXAMPLES.size == 0) {
        setExample(language, 0);
    } else {
        var firstMapKey = USER_EXAMPLES.entries().next().value[0];
        SetExampleFromCookies(firstMapKey);
    }
};

function setExample(language, selected_index) {
    //console.log("Selecting example: " + selected_index + " for Compiler: " + language);
    aceEditor.getSession().setValue("");
    getfile(language, selected_index, 0);

    // cleaning file to Save name
    //$("#cbx_example_name")[0].value = "";
}

function getfile(language, selected_index, index = 0) {
    var vExamples = cSharpFiles;

    var numfiles = vExamples[selected_index].length;
    if (index < numfiles) {
        var file = vExamples[selected_index][index];
        //console.log("getting example file: " + file);
        $.get(file, function(data) {
            aceEditor.getSession().setValue(aceEditor.getSession().getValue() + data);
            getfile(language, selected_index, index + 1);
        });
    }
}

function addOptionToSelectionBox(textToOption, valueToOption, walletSelectionBox, title = "") {
    var option = document.createElement("option");
    option.text = textToOption;
    option.value = valueToOption;
    option.title = title;
    var select = document.getElementById(walletSelectionBox);
    select.appendChild(option);
}

function updateCompilersSelectionBox(compilerType) {
    $.get(BASE_PATH_COMPILERS + '/getcompilers',
        function(data) {
            compilerSelectionBoxID = "compilers_versions-selection-box";
            compilerSelectionBoxObj = document.getElementById(compilerSelectionBoxID);
            compilerSelectionBoxObj.options.length = 0;

            indexToSelect = 0;
            for (c = 0; c < data.length; c++) {
                if (data[c].compiler == compilerType) {
                    var valueToOption = compilerType + ":" + data[c].version;
                    addOptionToSelectionBox(data[c].version, valueToOption, compilerSelectionBoxID, "Selected code example is " + valueToOption);
                    if (data[c].version === "latest")
                        indexToSelect = compilerSelectionBoxObj.length - 1;
                }
            }
            $("#compilebtn")[0].disabled = false;
            //Select the latest as default
            compilerSelectionBoxObj.selectedIndex = indexToSelect;
        },
        "json" // The format the response should be in
    );
}

setCompiler("csharp");