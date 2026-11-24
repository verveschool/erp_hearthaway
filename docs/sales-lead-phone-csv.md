# Phone values in lead CSV files

Sales, Portfolio and Partners export the Phone column as a literal URI, such as `tel:+919876543210` or `tel:02079460958`. This keeps spreadsheet software from converting the digits to a number. The bulk importer accepts these cells and ordinary formatted numbers, removes the URI prefix and formatting, and stores the result as a string.

A fully specified scientific value such as `9.19949123456E+11` yields `tel:919949123456`. A rounded value such as `9.19949E+11`, a missing number or malformed input produces an empty Phone cell. The row stays in the export. Use an authoritative source to correct the phone through Edit lead. The separate WhatsApp field supplies only the WhatsApp contact action.
