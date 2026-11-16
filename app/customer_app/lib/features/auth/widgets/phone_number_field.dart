import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/app_text.dart';

class PhoneCountryCode {
  const PhoneCountryCode(this.code, this.isoCode, this.namePt, this.nameEn);

  final String code;
  final String isoCode;
  final String namePt;
  final String nameEn;

  String name(BuildContext context) => appText(context, namePt, nameEn);
}

const phoneCountryCodes = [
  PhoneCountryCode('+258', 'MZ', 'Moçambique', 'Mozambique'),
  PhoneCountryCode('+27', 'ZA', 'África do Sul', 'South Africa'),
  PhoneCountryCode('+55', 'BR', 'Brasil', 'Brazil'),
  PhoneCountryCode('+244', 'AO', 'Angola', 'Angola'),
  PhoneCountryCode('+351', 'PT', 'Portugal', 'Portugal'),
  PhoneCountryCode('+1', 'US', 'Estados Unidos/Canadá', 'United States/Canada'),
  PhoneCountryCode('+44', 'GB', 'Reino Unido', 'United Kingdom'),
  PhoneCountryCode('+34', 'ES', 'Espanha', 'Spain'),
  PhoneCountryCode('+33', 'FR', 'França', 'France'),
  PhoneCountryCode('+49', 'DE', 'Alemanha', 'Germany'),
  PhoneCountryCode('+91', 'IN', 'Índia', 'India'),
  PhoneCountryCode(
    '+971',
    'AE',
    'Emirados Árabes Unidos',
    'United Arab Emirates',
  ),
  PhoneCountryCode('+234', 'NG', 'Nigéria', 'Nigeria'),
  PhoneCountryCode('+254', 'KE', 'Quénia', 'Kenya'),
  PhoneCountryCode('+255', 'TZ', 'Tanzânia', 'Tanzania'),
  PhoneCountryCode('+263', 'ZW', 'Zimbabué', 'Zimbabwe'),
  PhoneCountryCode('+256', 'UG', 'Uganda', 'Uganda'),
  PhoneCountryCode('+250', 'RW', 'Ruanda', 'Rwanda'),
];

String formatInternationalPhone(String countryCode, String localNumber) {
  final digits = _normalizedLocalDigits(localNumber);
  return '$countryCode$digits';
}

bool isValidInternationalPhone(String countryCode, String localNumber) {
  final digits = _normalizedLocalDigits(localNumber);
  final countryDigits = countryCode.replaceAll(RegExp(r'\D'), '');
  return digits.length >= 6 && countryDigits.length + digits.length <= 15;
}

String _normalizedLocalDigits(String number) =>
    number.replaceAll(RegExp(r'\D'), '').replaceFirst(RegExp(r'^0+'), '');

class PhoneNumberField extends StatelessWidget {
  const PhoneNumberField({
    required this.controller,
    required this.countryCode,
    required this.onCountryCodeChanged,
    required this.validator,
    super.key,
  });

  final TextEditingController controller;
  final String countryCode;
  final ValueChanged<String> onCountryCodeChanged;
  final FormFieldValidator<String> validator;

  @override
  Widget build(BuildContext context) {
    final selectedCountry = phoneCountryCodes.firstWhere(
      (country) => country.code == countryCode,
      orElse: () => phoneCountryCodes.first,
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final scale = MediaQuery.textScalerOf(context).scale(14) / 14;
        final stackFields =
            constraints.maxWidth < 320 ||
            (scale >= 1.3 && constraints.maxWidth < 380);
        final countryField = DropdownButtonFormField<String>(
          initialValue: selectedCountry.code,
          isExpanded: true,
          decoration: InputDecoration(
            labelText: appText(context, 'Código do país', 'Country code'),
            border: const OutlineInputBorder(),
            contentPadding: const EdgeInsets.symmetric(horizontal: 10),
          ),
          selectedItemBuilder: (context) => [
            for (final country in phoneCountryCodes)
              Align(
                alignment: Alignment.centerLeft,
                child: Text('${country.code} ${country.isoCode}'),
              ),
          ],
          items: [
            for (final country in phoneCountryCodes)
              DropdownMenuItem(
                value: country.code,
                child: Text(
                  '${country.code} ${country.name(context)}',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
          ],
          onChanged: (value) {
            if (value != null) onCountryCodeChanged(value);
          },
        );
        final numberField = TextFormField(
          controller: controller,
          keyboardType: TextInputType.phone,
          autofillHints: const [AutofillHints.telephoneNumberNational],
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: InputDecoration(
            labelText: appText(context, 'Número de telefone', 'Phone number'),
            hintText: '84 123 4567',
            prefixIcon: const Icon(Icons.phone_outlined),
            border: const OutlineInputBorder(),
          ),
          validator: validator,
        );

        if (stackFields) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              countryField,
              const SizedBox(height: 12),
              numberField,
            ],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(width: 126, child: countryField),
            const SizedBox(width: 10),
            Expanded(child: numberField),
          ],
        );
      },
    );
  }
}
